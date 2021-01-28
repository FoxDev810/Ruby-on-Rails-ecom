#!/bin/bash
set -ex

# Create 'openstreetmap' user
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" <<-EOSQL
    CREATE USER openstreetmap PASSWORD 'openstreetmap';
    GRANT ALL PRIVILEGES ON DATABASE openstreetmap TO openstreetmap;
EOSQL

# Create btree_gist extensions
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -c "CREATE EXTENSION btree_gist" openstreetmap
