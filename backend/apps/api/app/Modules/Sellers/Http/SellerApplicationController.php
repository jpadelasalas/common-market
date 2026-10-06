<?php

namespace App\Modules\Sellers\Http;

use App\Http\ApiException;
use App\Http\Paginated;
use App\Modules\Administration\Audit;
use App\Modules\Sellers\Models\SellerApplication;
use App\Modules\Sellers\ReviewState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * API-09 (AC-18): admin-only seller application review. Pending → approved or rejected, once;
 * a rejection needs a reason the applicant can understand. Every decision is audited.
 */
class SellerApplicationController
{
    public function index(Request $request): JsonResponse
    {
        $input = $request->validate([
            'state' => ['nullable', Rule::in(['all', ...array_column(ReviewState::cases(), 'value')])],
            ...Paginated::RULES,
        ]);
        $state = $input['state'] ?? ReviewState::Pending->value;

        $page = SellerApplication::query()
            ->with('seller')
            ->when($state !== 'all', fn ($q) => $q->where('state', $state))
            ->orderBy('number')
            ->paginate(Paginated::perPage($input));
        $counts = SellerApplication::selectRaw('state, count(*) as total')->groupBy('state')->pluck('total', 'state');

        return Paginated::response($page, fn (SellerApplication $a) => self::summary($a), ['counts' => array_map('intval', $counts->all())]);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(['data' => self::detail(SellerApplication::with(['seller', 'reviewer'])->findOrFail($id))]);
    }

    public function decide(Request $request, string $id): JsonResponse
    {
        $input = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'reason' => ['nullable', 'required_if:decision,reject', 'string', 'min:5', 'max:500'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ], ['reason.required_if' => 'Give a reason the applicant can understand.']);

        DB::transaction(function () use ($request, $id, $input) {
            $application = SellerApplication::lockForUpdate()->findOrFail($id);
            if ($application->state !== ReviewState::Pending) {
                throw new ApiException(409, 'already_decided', "This application was already {$application->state->value}.");
            }
            if ($application->version !== (int) $input['expected_version']) {
                throw new ApiException(409, 'stale_version', 'This application changed since you opened it. Review it again.');
            }

            $state = $input['decision'] === 'approve' ? ReviewState::Approved : ReviewState::Rejected;
            $application->forceFill([
                'state' => $state,
                'review_reason' => $input['reason'] ?? null,
                'reviewer_user_id' => $request->user()->id,
                'reviewed_at' => now(),
                'version' => $application->version + 1,
            ])->save();
            // Approval is what lets the shop use the seller workspace and publish (BR-01).
            $application->seller->forceFill(['status' => $state])->save();
            Audit::record("seller_application.{$state->value}", $application, array_filter(['reason' => $input['reason'] ?? null]));
        });

        return $this->show($id);
    }

    private static function summary(SellerApplication $a): array
    {
        return [
            'id' => $a->id,
            'reference' => sprintf('APP-%03d', $a->number),
            'shop' => ['id' => $a->seller->id, 'name' => $a->seller->name],
            'contact_name' => $a->contact_name,
            'category_label' => $a->category_label,
            'state' => $a->state->value,
            'submitted_at' => $a->created_at->toIso8601String(),
        ];
    }

    private static function detail(SellerApplication $a): array
    {
        $history = DB::table('audit_events')
            ->leftJoin('users', 'users.id', '=', 'audit_events.actor_user_id')
            ->where('entity_type', 'seller_application')
            ->where('entity_id', $a->id)
            ->orderBy('audit_events.created_at')
            ->get(['action', 'users.name as actor', 'audit_events.created_at as at', 'changes']);

        return self::summary($a) + [
            'contact_email' => $a->contact_email,
            'about' => $a->about,
            'sample_image_url' => $a->sample_image_url,
            'review_reason' => $a->review_reason,
            'reviewed_at' => $a->reviewed_at?->toIso8601String(),
            'reviewer' => $a->reviewer?->name,
            'version' => $a->version,
            'history' => $history->map(fn ($e) => [
                'action' => $e->action,
                'actor' => $e->actor,
                'at' => \Illuminate\Support\Carbon::parse($e->at)->toIso8601String(),
                'reason' => json_decode($e->changes ?? 'null', true)['reason'] ?? null,
            ])->all(),
        ];
    }
}
