---
title: Pagination
description: Page through long lists with page and limit.
icon: list-ordered
---

List endpoints return results in pages. Use the `page` and `limit` query parameters to choose which page to fetch and how many items it contains (at most 100):

```bash
curl "${[ base_url ]}/stores/${[ store_id ]}/products?page=2&limit=50"
```

The response includes the total number of items, so you know when to stop:

```json
{
  "data": [],
  "page": 2,
  "limit": 50,
  "total": 134
}
```
