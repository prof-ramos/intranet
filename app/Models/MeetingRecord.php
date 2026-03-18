<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MeetingRecord extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['title', 'description', 'meeting_date', 'recorded_by', 'related_task_id', 'related_contact_id'];

    protected $casts = ['meeting_date' => 'datetime'];

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function relatedTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'related_task_id');
    }

    public function relatedContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'related_contact_id');
    }
}
