---
title: Introduction
description: Everything you need to build on the Acme Store API.
icon: house
---

The Acme Store API lets you manage the products, orders and customers of an Acme storefront over plain HTTPS, GraphQL and WebSockets.

All requests go to the base URL of the environment you work with:

```text
${[ base_url ]}
```

Switch the environment in the header to see the URLs for production and staging. Requests are authenticated with a bearer token, `Authorization: Bearer ${[ api_token ]}`. See [Authentication](./guides/authentication.md) for how to get one.

## Next steps

- Make your first request in the [Quickstart](./quickstart.md).
- Browse every endpoint in the [API reference](/reference/).
