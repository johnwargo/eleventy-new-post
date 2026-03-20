#!/usr/bin/env zx

await $`npm login`;
await $`npm version patch`;
await $`git push`;
await $`npm publish`;
