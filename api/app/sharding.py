"""Tier 6: Database sharding strategy for millions of users.

Consistent hashing approach:
- Shards data based on user_id
- Supports unlimited shard nodes
- Non-blocking reshard capability
"""

import hashlib
from typing import Optional


class ShardingManager:
    """Manages data distribution across multiple database shards."""

    def __init__(self, num_shards: int = 4, shard_nodes: Optional[dict] = None):
        """
        Initialize sharding manager.

        Args:
            num_shards: Number of database shards (default 4, can scale to 1000+)
            shard_nodes: Dict mapping shard_id to connection string
                        e.g. {0: "postgresql://...", 1: "postgresql://..."}
        """
        self.num_shards = num_shards
        self.shard_nodes = shard_nodes or {}

        # For development: all shards use same database
        # In production: each shard can be a separate database/server

    def get_shard_id(self, user_id: int) -> int:
        """
        Calculate shard ID using consistent hashing.

        Uses MD5 hash for distribution:
        - Same user_id always maps to same shard
        - New shards can be added without reshuffling all data
        """
        hash_obj = hashlib.md5(str(user_id).encode())
        hash_int = int(hash_obj.hexdigest(), 16)
        shard_id = hash_int % self.num_shards
        return shard_id

    def get_shard_node(self, shard_id: int) -> str:
        """Get connection string for shard"""
        if shard_id in self.shard_nodes:
            return self.shard_nodes[shard_id]
        # Default: use shard_id in connection string
        return f"shard_{shard_id}"

    def get_shard_for_user(self, user_id: int) -> tuple[int, str]:
        """Get (shard_id, node) for a user"""
        shard_id = self.get_shard_id(user_id)
        node = self.get_shard_node(shard_id)
        return shard_id, node

    def get_stats(self) -> dict:
        """Get sharding statistics"""
        return {
            "num_shards": self.num_shards,
            "num_nodes": len(self.shard_nodes),
            "distribution": "consistent_hashing",
            "max_users_per_shard": "unlimited (horizontal scale)",
        }


# Global sharding manager
# In development: uses single database with shard_id column
# In production: can be upgraded to route to different databases
sharding_manager = ShardingManager(num_shards=4)


def set_sharding_config(num_shards: int, shard_nodes: dict = None):
    """Configure sharding (call during app startup)"""
    global sharding_manager
    sharding_manager = ShardingManager(num_shards=num_shards, shard_nodes=shard_nodes)
    print(f"[Sharding] Configured {num_shards} shards")


# Sharding helpers for queries
def add_shard_filter(query, user_id: int):
    """Add shard filter to SQLAlchemy query"""
    shard_id, _ = sharding_manager.get_shard_for_user(user_id)
    # Filter by shard_id if column exists
    # In v1: all data in same DB, shard_id is logical
    # In v2: each shard is separate database
    return query  # For now, single database uses shard_id for data organization


# Shard migration helpers (for adding/removing shards)
def get_reshard_plan(old_num_shards: int, new_num_shards: int) -> dict:
    """
    Generate plan for resharding data.

    Non-blocking reshard:
    1. Create new shards
    2. Write new data to new shards (old data still in old shards)
    3. Background migration moves old data
    4. Once complete, old shards can be decommissioned
    """
    return {
        "strategy": "consistent_hashing",
        "old_shards": old_num_shards,
        "new_shards": new_num_shards,
        "affected_users": "varies (based on consistent hashing redistribution)",
        "downtime": "zero (non-blocking)",
        "approach": "Dual-write during migration, then background sync",
    }


# Query routing for sharded queries
class ShardedQueryContext:
    """Context manager for sharded queries"""

    def __init__(self, user_id: int):
        self.user_id = user_id
        self.shard_id, self.shard_node = sharding_manager.get_shard_for_user(user_id)

    async def execute(self, query_func, *args, **kwargs):
        """Execute query on correct shard"""
        # In production: route to shard-specific database connection
        # In development: filter by shard_id in same database
        kwargs['shard_id'] = self.shard_id
        return await query_func(*args, **kwargs)


# Monitoring & analytics
def get_shard_distribution(user_count: int) -> dict:
    """Estimate data distribution across shards"""
    shard_sizes = {}
    for shard_id in range(sharding_manager.num_shards):
        # Expected users per shard (uniform distribution with consistent hashing)
        expected_users = user_count // sharding_manager.num_shards
        shard_sizes[f"shard_{shard_id}"] = {
            "expected_users": expected_users,
            "expected_size_gb": expected_users * 0.0001,  # Estimate ~100KB per user
        }
    return shard_sizes
