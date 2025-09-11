#!/bin/bash

# Find all files that use getServerSession and fix them
grep -rl "getServerSession" app/api app/settings app/lib | while read -r file; do
  echo "Processing $file"
  # Replace imports
  sed -i "s|import { getServerSession } from 'next-auth/next'|import { auth } from '@/auth'|" "$file"
  sed -i "s|import { getServerSession } from 'next-auth'|import { auth } from '@/auth'|" "$file"
  sed -i "/import { authOptions } from '.\+\/auth/d" "$file"

  # Replace getServerSession(authOptions) with auth()
  sed -i 's|getServerSession(authOptions)|auth()|g' "$file"
done

echo "Done."
