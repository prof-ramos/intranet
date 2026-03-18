<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuickLink extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'url', 'icon', 'category', 'active', 'order'];

    protected $casts = ['active' => 'boolean', 'order' => 'integer'];

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order', 'asc');
    }
}
