---
title: Quickstart
description: Make your first request in under a minute.
icon: rocket
---

## 1. Get a token

Exchange your credentials for an access token:

```bash
curl -X POST ${[ base_url ]}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "..."}'
```

## 2. List products

Use the token to list the products of your store (`${[ store_id ]}`):

```bash
curl ${[ base_url ]}/stores/${[ store_id ]}/products \
  -H "Authorization: Bearer $TOKEN"
```

That's it! Continue with [pagination](./guides/pagination.md) to fetch more than one page of results.
