<?php

namespace App\Models;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[ObservedBy([TaskObserver::class])]
class Task extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'assigned_to',
        'created_by',
        'related_contact_id',
        'deadline',
        'completed_at',
        'status',
        'priority',
    ];

    protected $casts = [
        'deadline' => 'datetime',
        'completed_at' => 'datetime',
        'status' => TaskStatus::class,
        'priority' => TaskPriority::class,
    ];

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function relatedContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'related_contact_id');
    }

    public function scopeOverdue($query)
    {
        return $query->where('deadline', '<', now())
            ->where('status', '!=', TaskStatus::Done);
    }

    public function scopeDueThisWeek($query)
    {
        return $query->whereBetween('deadline', [
            now()->startOfWeek(),
            now()->endOfWeek(),
        ]);
    }

    public function scopeByStatus($query, TaskStatus $status)
    {
        return $query->where('status', $status->value);
    }

    public function scopeByPriority($query, TaskPriority $priority)
    {
        return $query->where('priority', $priority->value);
    }
}
