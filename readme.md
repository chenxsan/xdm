# xdm

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]

**xdm** is an MDX compiler that focussed on two things:

1.  Compiling the MDX syntax (markdown + JSX) to JavaScript
2.  Making it easier to use the MDX syntax in different places

This is mostly things I wrote for `@mdx-js/mdx` which are not slated to be
released (soon?) plus some further changes that I think are good ideas (source
maps, ESM only, defaulting to an automatic JSX runtime, more docs).

## Install

Use Node 12 or later.
Then install `xdm` with either npm or yarn.

[npm][]:

```sh
npm install xdm
```

[yarn][]:

```sh
yarn add xdm
```

`xdm` is ESM-only.
You must `import` it (`require` doesn’t work).
This is because in April, which is soon, the last Node version without ESM will
reach end of life and projects will start migrating to ESM-only around that
time.

## Contents

*   [What is MDX?](#what-is-mdx)
*   [Use](#use)
*   [API](#api)
    *   [`compile(file, options?)`](#compilefile-options)
    *   [`compileSync(file, options?)`](#compilesyncfile-options)
    *   [`evaluate(file, options)`](#evaluatefile-options)
    *   [`evaluateSync(file, options)`](#evaluatesyncfile-options)
*   [MDX syntax](#mdx-syntax)
    *   [Markdown](#markdown)
    *   [JSX](#jsx)
    *   [ESM](#esm)
    *   [Expressions](#expressions)
*   [MDX content](#mdx-content)
    *   [Components](#components)
    *   [Layout](#layout)
*   [Integrations](#integrations)
    *   [Bundlers](#bundlers)
    *   [Build systems](#build-systems)
    *   [Compilers](#compilers)
    *   [Site generators](#site-generators)
    *   [Hyperscript implementations (frameworks)](#hyperscript-implementations-frameworks)
    *   [Runtime libraries](#runtime-libraries)
*   [Guides](#guides)
    *   [GitHub flavored markdown (GFM)](#github-flavored-markdown-gfm)
    *   [Syntax highlighting](#syntax-highlighting)
    *   [Math](#math)
    *   [Footnotes](#footnotes)
    *   [Frontmatter](#frontmatter)
*   [Differences from `@mdx-js/mdx`](#differences-from-mdx-jsmdx)
*   [Security](#security)
*   [Related](#related)
*   [License](#license)

## What is MDX?

MDX is different things.
The term is sometimes used for a compiler, typically implying `@mdx-js/mdx`, but
there are more.
First there was [`mdxc`][mdxc].
Then came [`@mdx-js/mdx`][mdxjs].
There’s also [`mdsvex`][mdsvex].
And now there’s **xdm** too.

Sometimes the term is used for a runtime/helper library.
**xdm** has **no runtime**.

Most often the term is used for the format: markdown + JS(X) (there are some
[caveats][]):

```mdx
## Hello, world!

<div className="note">
  > Some notable things in a block quote!
</div>
```

See?
Most of markdown works!
Those XML-like things are not HTML though: they’re JSX.
Note that there are some differences in how JSX should be authored: for example,
React and Preact expect `className`, whereas Vue expects `class`.
See [§ MDX syntax][mdx-syntax] below for more on how the format works.

## Use

This section describes how to use the API.
See [§ MDX syntax][mdx-syntax] on how the format works.
See [§ Integrations][integrations] on how to use **xdm** with webpack, Rollup,
Babel, etc.

Say we have an MDX document, `example.mdx`:

```mdx
export const Thing = () => <>World!</>

# Hello, <Thing />
```

First, a rough idea of what the result will be.
The below is not the actual output, but it might help to form a mental model:

```js
/* @jsxRuntime automatic @jsxImportSource react */

export const Thing = () => <>World!</>

export default function MDXContent() {
  return <h1>Hello, <Thing /></h1>
}
```

Some observations:

*   The output is serialized JavaScript that still needs to be evaluated
*   A comment is injected to configure how JSX is handled
*   It’s is a complete file with import/exports
*   A component (`MDXContent`) is exported

***

To compile `example.mdx` add some code in `example.js`:

```js
import fs from 'fs/promises'
import {compile} from 'xdm'

main()

async function main() {
  var compiled = await compile(await fs.readFile('example.mdx'))
  console.log(String(compiled))
}
```

Now, the *actual* output of running `node example.js` is:

```js
/* @jsxRuntime automatic @jsxImportSource react */
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from 'react/jsx-runtime'

export const Thing = () => _jsx(_Fragment, {children: 'World!'})

function MDXContent(_props) {
  const _components = Object.assign({h1: 'h1'}, _props.components)
  const {wrapper: MDXLayout} = _components
  const _content = _jsx(_Fragment, {
    children: _jsxs(_components.h1, {
      children: ['Hello, ', _jsx(Thing, {})]
    })
  })
  return MDXLayout
    ? _jsx(MDXLayout, Object.assign({}, _props, {children: _content}))
    : _content
}

export default MDXContent
```

Some more observations:

*   JSX is compiled away to function calls and an import of React
*   The content component can be given `{components: {h1: MyComponent}}` to use
    something else for the heading
*   The content component can be given `{components: {wrapper: MyLayout}}` to
    wrap the whole content

See [§ MDX content][mdx-content] below on how to use the result.

## API

`xdm` exports the following identifiers:
[`compile`][compile],
[`compileSync`](#compilesyncfile-options),
[`evaluate`][eval], and
[`evaluateSync`](#evaluatesyncfile-options).
There is no default export.

`xdm/webpack.cjs` exports a [webpack][] loader as the default export.

### `compile(file, options?)`

Compile MDX to JS.

###### `file`

MDX document to parse (`string`, [`Buffer`][buffer] in UTF-8, [`vfile`][vfile],
or anything that can be given to `vfile`).

<details>
<summary>Example</summary>

```js
import vfile from 'vfile'
import {compile} from 'xdm'

await compile(':)')
await compile(Buffer.from(':-)'))
await compile({path: 'path/to/file.mdx', contents: '🥳'})
await compile(vfile({path: 'path/to/file.mdx', contents: '🤭'}))
```

</details>

###### `options.remarkPlugins`

List of [remark plugins][remark-plugins], presets, and pairs.

<details>
<summary>Example</summary>

```js
import remarkFrontmatter from 'remark-frontmatter' // YAML and such.
import remarkGfm from 'remark-gfm' // Tables, strikethrough, tasklists, literal URLs.

await compile(file, {remarkPlugins: [remarkGfm]}) // One plugin.
await compile(file, {remarkPlugins: [[remarkFrontmatter, 'toml']]}) // A plugin with options.
await compile(file, {remarkPlugins: [remarkGfm, remarkFrontmatter]}) // Two plugins.
await compile(file, {remarkPlugins: [[remarkGfm, {singleTilde: false}], remarkFrontmatter]}) // Two plugins, first w/ options.
```

</details>

###### `options.rehypePlugins`

List of [rehype plugins][rehype-plugins], presets, and pairs.

<details>
<summary>Example</summary>

```js
import rehypeKatex from 'rehype-katex' // Render math with KaTeX.
import remarkMath from 'remark-math' // Support math like `$so$`.

await compile(file, {remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex]})

await compile(file, {
  remarkPlugins: [remarkMath],
  // A plugin with options:
  rehypePlugins: [[rehypeKatex, {throwOnError: true, strict: true}]]
})
```

</details>

###### `options.SourceMapGenerator`

The `SourceMapGenerator` class from [`source-map`][source-map] (optional).
When given, the resulting file will have a `map` field set to a source map (in
object form).

<details>
<summary>Example</summary>

Assuming `example.mdx` from [§ Use][use] exists, then:

```js
import fs from 'fs/promises'
import {SourceMapGenerator} from 'source-map'
import {compile} from 'xdm'

main()

async function main() {
  var file = await compile(
    {path: 'example.mdx', contents: await fs.readFile('example.mdx')},
    {SourceMapGenerator}
  )

  console.log(file.map)
}
```

…yields:

```js
{
  version: 3,
  sources: ['example.mdx'],
  names: ['Thing'],
  mappings: ';;aAAaA,QAAQ;YAAQ;;;;;;;;iBAE3B',
  file: 'example.mdx'
}
```

</details>

###### `options.providerImportSource`

Place to import a provider from (`string?`, example: `'@mdx-js/react'`).
Useful for runtimes that support context (React, Preact).
The provider must export a `useMDXComponents`, which is called to access an
object of components.

<details>
<summary>Example</summary>

If `file` is the contents of `example.mdx` from [§ Use][use], then:

```js
compile(file, {providerImportSource: '@mdx-js/react'})
```

…yields this difference:

```diff
 /* @jsxRuntime classic @jsx React.createElement @jsxFrag React.Fragment */
 import React from 'react'
+import {useMDXComponents as _provideComponents} from '@mdx-js/react'

 export const Thing = () => React.createElement(React.Fragment, null, 'World!')

 function MDXContent(_props) {
-  const _components = Object.assign({h1: 'h1'}, _props.components)
+  const _components = Object.assign({h1: 'h1'}, _provideComponents(), _props.components)
   const {wrapper: MDXLayout} = _components
   const _content = React.createElement(
     React.Fragment,
```

</details>

###### `options.jsx`

Whether to keep JSX (`boolean?`, default: `false`).
The default is to compile JSX away so that the resulting file is immediately
runnable.

<details>
<summary>Example</summary>

If `file` is the contents of `example.mdx` from [§ Use][use], then:

```js
compile(file, {jsx: true})
```

…yields this difference:

```diff
 /* @jsxRuntime classic @jsx React.createElement @jsxFrag React.Fragment */
-import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from 'react/jsx-runtime'
-
-export const Thing = () => React.createElement(React.Fragment, null, 'World!')
+export const Thing = () => <>World!</>

 function MDXContent(_props) {
   const _components = Object.assign({h1: 'h1'}, _props.components)
   const {wrapper: MDXLayout} = _components
-  const _content = _jsx(_Fragment, {
-    children: _jsxs(_components.h1, {
-      children: ['Hello, ', _jsx(Thing, {})]
-    })
-  })
+  const _content = (
+    <>
+      <_components.h1>{'Hello, '}<Thing /></_components.h1>
+    </>
+  )
…
```

</details>

###### `options.jsxRuntime`

JSX runtime to use (`string`, `'automatic'` or `'classic'`, default:
`'automatic'`).
The classic runtime compiles to calls such as `h('p')`, the automatic runtime
compiles to `import _jsx from '$importSource/jsx-runtime'\n_jsx('p')`.

<details>
<summary>Example</summary>

If `file` is the contents of `example.mdx` from [§ Use][use], then:

```js
compile(file, {jsxRuntime: 'classic'})
```

…yields this difference:

```diff
-/* @jsxRuntime automatic @jsxImportSource react */
-import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from 'react/jsx-runtime'
+/* @jsxRuntime classic @jsx React.createElement @jsxFrag React.Fragment */
+import React from 'react'

-export const Thing = () => _jsx(_Fragment, {children: 'World!'})
+export const Thing = () => React.createElement(React.Fragment, null, 'World!')
…
```

</details>

###### `options.jsxImportSource`

Place to import automatic JSX runtimes from (`string?`, default: `react`).
When in the `automatic` runtime, this is used to define an import for
`_Fragment`, `_jsx`, and `_jsxs`.

<details>
<summary>Example</summary>

If `file` is the contents of `example.mdx` from [§ Use][use], then:

```js
compile(file, {jsxImportSource: 'preact'})
```

…yields this difference:

```diff
-/* @jsxRuntime automatic @jsxImportSource react */
-import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from 'react/jsx-runtime'
+/* @jsxRuntime automatic @jsxImportSource preact */
+import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from 'preact/jsx-runtime'
```

</details>

###### `options.pragma`

Pragma for JSX (`string?`, default: `'React.createElement'`).
When in the `classic` runtime, this is used as an identifier for function calls:
`<x />` to `React.createElement('x')`.

You should most probably define `pragmaFrag` and `pragmaImportSource` too when
changing this.

<details>
<summary>Example</summary>

If `file` is the contents of `example.mdx` from [§ Use][use], then:

```js
compile(file, {
  jsxRuntime: 'classic',
  pragma: 'preact.createElement',
  pragmaFrag: 'preact.Fragment',
  pragmaImportSource: 'preact/compat'
})
```

…yields this difference:

```diff
-/* @jsxRuntime classic @jsx React.createElement @jsxFrag React.Fragment */
-import React from 'react'
+/* @jsxRuntime classic @jsx preact.createElement @jsxFrag preact.Fragment */
+import preact from 'preact/compat'

-export const Thing = () => React.createElement(React.Fragment, null, 'World!')
+export const Thing = () => preact.createElement(preact.Fragment, null, 'World!')
…
```

</details>

###### `options.pragmaFrag`

Pragma for JSX fragments (`string?`, default: `'React.Fragment'`).
When in the `classic` runtime, this is used as an identifier for fragments: `<>`
to `React.createElement(React.Fragment)`.

See `options.pragma` for an example.

###### `options.pragmaImportSource`

Where to import the identifier of `pragma` from (`string?`, default: `'react'`).
When in the `classic` runtime, this is used to import the `pragma` function.
To illustrate with an example: when `pragma` is `'a.b'` and `pragmaImportSource`
is `'c'` this following will be generated: `import a from 'c'`.

See `options.pragma` for an example.

###### Returns

`Promise.<VFile>` — Promise that resolves to the compiled JS as a [vfile][].

<details>
<summary>Example</summary>

```js
import preset from 'remark-preset-lint-consistent' // Lint rules to check for consistent markdown.
import reporter from 'vfile-reporter'
import {compile} from 'xdm'

main()

async function main() {
  var file = await compile('*like this* or _like this_?', {remarkPlugins: [preset]})
  console.error(reporter(file))
}
```

Yields:

```txt
  1:16-1:27  warning  Emphasis should use `*` as a marker  emphasis-marker  remark-lint

⚠ 1 warning
```

</details>

### `compileSync(file, options?)`

Compile MDX to JS.
Synchronous version of `compile`.
When possible please use the async `compile`.

### `evaluate(file, options)`

Run MDX.
This does not support imports and it’s called **evaluate** because it `eval`s
JavaScript.
To get the full power of MDX it’s suggested to use `compile`, write to a file,
and then run with Node or bundle with webpack/Rollup.
But if you trust your content and know that it doesn’t contain imports,
`evaluate` can work.

###### `file`

See [`compile`][compile].

###### `options.jsx`

###### `options.jsxs`

###### `options.Fragment`

These three options are required.
They come from an automatic JSX runtime that you must import yourself.

<details>
<summary>Example</summary>

```js
import * as runtime from 'react/jsx-runtime.js'

var {default: Content} = await evaluate('# hi', {...runtime, ...otherOptions})
```

</details>

###### `options.remarkPlugins`

###### `options.rehypePlugins`

Same as for [`compile`][compile].

###### `options.useMDXComponents`

Needed if you want to support a provider.

<details>
<summary>Example</summary>

```js
import * as provider from '@mdx-js/react'
import * as runtime from 'react/jsx-runtime.js'

var {default: Content} = await evaluate('# hi', {...provider, ...runtime, ...otherOptions})
```

</details>

###### Returns

`Promise.<Object>` — Promise that resolves to something that looks a bit like a
module: an object with a `default` field set to the component and anything else
that was exported from the MDX file available too.

<details>
<summary>Example</summary>

Assuming the contents of `example.mdx` from [§ Use][use] was in `file`, then:

```js
import * as runtime from 'react/jsx-runtime.js'
import {evaluate} from 'xdm'

console.log(await evaluate(file, {...runtime}))
```

…yields:

```js
{Thing: [Function: Thing], default: [Function: MDXContent]}
```

</details>

### `evaluateSync(file, options)`

Run MDX.
Synchronous version of [`evaluate`][eval].
When possible please use the async `evaluate`.

## MDX syntax

The MDX syntax is a mix between markdown and JSX.
Markdown often feels more natural to type than HTML (or JSX) for the common
things (like emphasis, headings).
JSX is an extension to JavaScript that *looks* like HTML but makes it convenient
to use components (reusable things).
See [this description](https://github.com/micromark/mdx-state-machine#71-syntax)
for a more formal description of the syntax.

This gives us something along the lines of [literate programming][lit].

MDX also gives us an odd mix of two languages: markdown is whitespace sensitive
and forgiving (what you type may not “work”, but it won’t crash) whereas
JavaScript is whitespace **insensitive** and **does** crash on typos.
Weirdly enough they combine pretty well!

It’s important to know markdown
([see this cheatsheet and tutorial](https://commonmark.org/help/) for help)
and have experience with JavaScript (specifically
[JSX](https://facebook.github.io/jsx/)) to write (and enjoy writing) MDX.

Some common gotchas with writing MDX are
[documented here](https://github.com/micromark/mdx-state-machine#74-common-mdx-gotchas).

### Markdown

Most of markdown ([CommonMark][]) works:

````mdx
# Heading (rank 1)
## Heading 2
### 3
#### 4
##### 5
###### 6

> Block quote

* Unordered
* List

1. Ordered
2. List

A paragraph, introducing a thematic break:

***

```js
some.code()
```

a [link](https://example.com), an ![image](./image.png), some *emphasis*,
something **strong**, and finally a little `code()`.
````

Some other features often used with markdown are:

*   **GFM** — autolink literals, strikethrough, tables, tasklists
    ([see guide below](#github-flavored-markdown-gfm))
*   **Frontmatter** — YAML
    ([see guide below](#frontmatter))
*   **Footnotes**
    ([see guide below](#footnotes))
*   **Math**
    ([see guide below](#math))
*   **Syntax highlighting**
    ([see guide below](#syntax-highlighting))

These are many more things possible by configuring
[remark plugins][remark-plugins] (and [rehype plugins][rehype-plugins]).

#### Caveats

Some markdown features don’t work in MDX:

```mdx
Indented code works in markdown, but not in MDX:

    console.log(1) // this is a paragraph in MDX!

The reason for that is so that you can nicely indent your components.

A different one is “autolinks”:

<svg:rect> and <admin@example.com> are links in markdown, but they crash xdm.
The reason is that they look a lot like JSX components, and we prefer being unambiguous.
If you want links, use [descriptive text](https://and-the-link-here.com).

HTML doesn’t work, because MDX has JSX instead (see next section).

And you must escape less than (`<`) and opening braces (`{`) like so: \< or \{.
```

More on this is
[documented here](https://github.com/micromark/mdx-state-machine#72-deviations-from-markdown).

### JSX

Most of JSX works.
Here’s some that looks a lot like HTML (but is JSX):

```js
<h1>Heading!</h1>

<abbr title="HyperText Markup Language">HTML</abbr> is a lovely language.

<section>
  And here is *markdown* in **JSX**!
</section>
```

You can also use components, but note that you must either define them locally
or pass them in later (see [§ MDX content][mdx-content]):

```js
<MyComponent id="123" />

Or access the `thisOne` component on the `myComponents` object: <myComponents.thisOne />

<Component
  open
  x={1}
  label={'this is a string, *not* markdown!'}
  icon={<Icon />}
/>
```

More on this is
[documented here](https://github.com/micromark/mdx-state-machine#73-deviations-from-jsx).

### ESM

To define things from within MDX, use ESM:

```js
import {External} from './some/place.js'

export const Local = props => <span style={{color: 'red'}} {...props} />

An <External /> component and <Local>a local component</Local>.
```

ESM can also be used for other things:

```js
import {MyChart} from './chart-component.js'
import data from './population.js'
export const pi = 3.14

<MyChart data={data} label={'Something with ' + pi} />
```

Note that when using [`evaluate`][eval], `imports` are not supported but exports
can still be used to define things in MDX (except `export … from`, which also
imports).

### Expressions

Braces can be used to embed JavaScript expressions in MDX:

```mdx
export const pi = 3.14

Two 🍰 is: {pi * 2}
```

Expressions can be empty or contain just a comment:

```mdx
{/* A comment! */}
```

## MDX content

It’s possible to pass components in.
Say we have a `message.mdx` file:

```mdx
# Hello, *<Planet />*!
```

This file could be imported from JavaScript and passed components like so:

```js
import Message from './message.mdx' // Assumes a bundler is used to compile MDX -> JS.

<Message components={{Planet: () => 'Venus'}} />
```

You can also change the things that come from markdown:

```js
<Message
  components={{
    // Map `h1` (`# heading`) to use `h2`s.
    h1: 'h2',
    // Rewrite `em`s (`*like so*`) to `i` with a red foreground color.
    em: (props) => <i style={{color: 'red'}} {...props} />,
    // Pass a layout (using the special `'wrapper'` key).
    wrapper: ({components, ...props}) => <main {...props} />,
    // Pass a component.
    Planet: () => 'Venus'
  }}
/>
```

### Components

The following keys can be passed in `components`:

*   HTML equivalents for the things you write with markdown (such as `h1` for
    `# heading`)**†**
*   `wrapper`, which defines the layout (but local layout takes precedence)
*   `*` anything else that is a valid JavaScript identifier (`foo`,
    `Components`, `_`, `$x`, `a1`) for the things you write with JSX (like
    `<So />` or `<like.so />`, note that locally defined components take
    precedence)**‡**

**†** Normally, in markdown, those are: `a`, `blockquote`, `code`, `em`, `h1`,
`h2`, `h3`, `h4`, `h5`, `h6`, `hr`, `img`, `li`, `ol`, `p`, `pre`, `strong`, and
`ul`.
With [`remark-gfm`][gfm] ([see guide below](#github-flavored-markdown-gfm)), you
can also use: `del`, `table`, `tbody`, `td`, `th`, `thead`, and `tr`.
Other remark plugins that add support for new constructs and advertise that they
work with rehype, will also work with **xdm**.

**‡** The rules for whether a name in JSX (`x` in `<x>`) is a literal tag name
or not, are as follows:

*   If there’s a dot, it’s a member expression (`<a.b>` -> `h(a.b)`)
*   Otherwise, if the name is not a valid identifier, it’s a literal (`<a-b>` ->
    `h('a-b')`)
*   Otherwise, if it starts with a lowercase, it’s a literal (`<a>` -> `h('a')`)
*   Otherwise, it’s an identifier (`<A>` -> `h(A)`)

### Layout

Layouts are components that wrap the whole content.
They can be defined from within MDX using a default export:

```js
export default function Layout({children}) => <main>{children}</main>

All the things.
```

The layout can also be imported and *then* exported with an `export … from` (but
not when using [`evaluate`][eval]):

```js
export {Layout as default} from './components.js'
```

The layout can also be passed as `components.wrapper` (but a local one takes
precedence).

## Integrations

### Bundlers

#### Webpack

Install `xdm` and use `xdm/webpack.cjs`.
Add something along these lines to your `webpack.config.js`:

```js
module.exports = {
  module: {
    // …
    rules: [
      // …
      {test: /\.mdx$/, use: [{loader: 'xdm/webpack.cjs', options: {}}]}
    ]
  }
}
```

Source maps are supported when [`SourceMapGenerator`][sm] is passed in.

If you use modern JavaScript features you might want to use Babel through
[`babel-loader`](https://webpack.js.org/loaders/babel-loader/) to compile to
code that works:

```js
// …
use: [
  // Note that Webpack runs right-to-left: `xdm` is used first, then
  // `babel-loader`.
  {loader: 'babel-loader', options: {}},
  {loader: 'xdm/webpack.cjs', options: {}}
]
// …
```

#### Rollup

Install `xdm` and use it directly.
Add something along these lines to your `rollup.config.js`:

```js
import path from 'path'
import {compile} from 'xdm'

export default {
  // …
  plugins: [
    // …
    {
      async transform(contents, fp) {
        if (path.extname(fp) !== '.mdx') return null
        var file = await compile({contents, path: fp}, {/* Options… */})
        return {code: file.contents, map: file.map}
      }
    }
  ]
}
```

Source maps are supported when [`SourceMapGenerator`][sm] is passed in.

If you use modern JavaScript features you might want to use Babel through
[`@rollup/plugin-babel`](https://github.com/rollup/plugins/tree/master/packages/babel)
to compile to code that works:

```js
// …
import {babel} from '@rollup/plugin-babel'

export default {
  // …
  plugins: [
    // …
    {
      async transform(contents, fp) {
        if (path.extname(fp) !== '.mdx') return null
        var file = await compile({contents, path: fp}, {/* Options… */})
        return {code: file.contents, map: file.map}
      }
    },
    babel({
      // Also run on what used to be `.mdx` (but is now JS):
      extensions: ['.js', '.jsx', '.es6', '.es', '.mjs', '.mdx'],
      // Other options…
    })
  ]
}
```

### Build systems

#### Snowpack

Snowpack uses Rollup (for local files) which can be extended.
Install `xdm` and add something along these lines to your `snowpack.config.js`:

```js
var path = require('path')
var {compile} = require('xdm')

module.exports = {
  // …
  packageOptions: {
    rollup: {
      plugins: [
        {
          async transform(contents, fp) {
            if (path.extname(fp) !== '.mdx') return null
            var file = await compile({contents, path: fp}, {/* Options… */})
            return {code: file.contents, map: file.map}
          }
        }
      ]
    }
  }
}
```

### Compilers

#### Babel

You should probably use webpack or Rollup instead of Babel directly as that
gives the neatest interface.
It is possible to use **xdm** in Babel and it’s fast, because it skips `xdm`
serialization and Babel parsing, if Babel is used anyway.

Babel does not support syntax extensions to its parser (it has “syntax” plugins
but those in fact turn certain flags on or off).
It does support setting a different parser.
Which in turn lets us choose whether to use the `xdm` or `@babel/parser`.

This Babel plugin, `plugin.js`:

```js
import path from 'path'
import parser from '@babel/parser'
import estreeToBabel from 'estree-to-babel'
import {compileSync} from 'xdm'

export function babelPluginSyntaxMdx() {
  // Tell Babel to use a different parser.
  return {parserOverride: babelParserWithMdx}
}

// A Babel parser that parses `.mdx` files with xdm and passes any other things
// through to the normal Babel parser.
function babelParserWithMdx(contents, options) {
  if (
    options.sourceFileName &&
    path.extname(options.sourceFileName) === '.mdx'
  ) {
    // Babel does not support async parsers, unfortunately.
    return compileSync(
      {contents, path: options.sourceFileName},
      // Tell xdm to return a Babel tree instead of serialized JS.
      {recmaPlugins: [recmaBabel]}
    ).result
  }

  return parser.parse(contents, options)
}

// A “recma” plugin is a unified plugin that runs on the estree (used by xdm
// and much of the JS ecosystem but not Babel).
// This plugin defines `'estree-to-babel'` as the compiler, which means that
// the resulting Babel tree is given back by `compileSync`.
function recmaBabel() {
  this.Compiler = estreeToBabel
}
```

Can be used like so with the Babel API:

```js
import babel from '@babel/core'
import {babelPluginSyntaxMdx} from './plugin.js'

// Note that a filename must be set for our plugin to know it’s MDX instead of JS.
await babel.transformAsync(file, {filename: 'example.mdx', plugins: [babelPluginSyntaxMdx]})
```

### Site generators

#### Create React App (CRA)

Create a new app with [CRA](https://github.com/facebook/create-react-app) and
change directory to enter it:

```sh
npx create-react-app my-app
cd my-app
```

Install `xdm` as a dev dependency:

```sh
yarn add xdm --dev
```

Now we can add our MDX content.
Create an MDX file `Content.mdx` in the `src/` folder:

```mdx
export const Box = () => (
  <div style={{padding: 20, backgroundColor: 'tomato'}} />
)

# Hello, world!

This is **markdown** with <span style={{color: "red"}}>JSX</span>: MDX!

<Box />
```

To use that content in the app, replace the contents of `App.js` in the `src/`
folder with:

```js
/* eslint-disable import/no-webpack-loader-syntax */
import Content from '!xdm/webpack.cjs!./Content.mdx'

export default function App() {
  return <Content />
}
```

Done!
To start the development server run:

```sh
yarn start
```

#### Next

Next uses webpack.
Install `xdm` and extend
[Next’s config](https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config)
in a `next.config.js` file like so:

```js
module.exports = {
  webpack(config) {
    config.module.rules.push({
      test: /\.mdx/,
      use: [{loader: 'xdm/webpack.cjs', options: {}}]
    })

    return config
  }
}
```

### Hyperscript implementations (frameworks)

#### React

Works out of the box.
You can set `providerImportSource` to `'@mdx-js/react'` (which has to be
installed) to support context-based components passing.

```js
import {MDXProvider} from '@mdx-js/react'
import Post from './post.mdx' // Assumes a bundler is used to compile MDX -> JS.

<MDXProvider components={{em: props => <i {...props} />}}>
  <Post />
</MDXProvider>
```

But the above can also be written without configuring and importing a provider:

```js
import Post from './post.mdx'

<Post components={{em: props => <i {...props} />}} />
```

#### Preact

Define a different import source in [options][compile]:

```js
compile(file, {jsxImportSource: 'preact'})
```

You can set `providerImportSource` to `'@mdx-js/preact'` (which has to be
installed) to support context-based components passing.
See React above for more information (but use `@mdx-js/preact`).

#### Svelte

Use [mdsvex][]!

#### Vue

Use Vue 3, which adds support for functional components and fragments, two
features heavily used in MDX.

Vue has a special way to compile JSX: **xdm** can’t do it but Babel can.
Tell `xdm` to keep the JSX:

```js
var jsx = String(await compile(file, {jsx: true}))
```

Then compile the JSX away with Babel and
[`@vue/babel-plugin-jsx`](https://github.com/vuejs/jsx-next/tree/dev/packages/babel-plugin-jsx):

```js
import babel from '@babel/core'

var js = (await babel.transformAsync(jsx, {plugins: ['@vue/babel-plugin-jsx']})).code
```

You are probably already using [webpack][] and/or [Rollup][] with Vue.
If not directly, then perhaps through something like Vue CLI.
In which case, see the above sections on these tools for how to use them, but
configure them as shown in this section to import `.mdx` files.

### Runtime libraries

#### Emotion

Define a different import source in [options][compile] at compile time:

```js
compile(file, {jsxImportSource: '@emotion/react'})
```

Otherwise, Emotion is React based, so see the React section for more info.

#### Theme UI

Theme UI is a React-specific library that requires using context to access its
effective components.
This can be done at the place where you’re using MDX content at runtime:

```js
import {base} from '@theme-ui/preset-base'
import {components, ThemeProvider} from 'theme-ui'
import Post from './post.mdx' // Assumes a bundler is used to compile MDX -> JS.

<ThemeProvider theme={base}>
  <Post components={components} />
</ThemeProvider>
```

If using a `providerImportSource` set to `'@mdx-js/react'` while compiling,
Theme UI automatically injects its components into that context:

```js
import {base} from '@theme-ui/preset-base'
import {ThemeProvider} from 'theme-ui'
import Post from './post.mdx'

<ThemeProvider theme={base}>
  <Post />
</ThemeProvider>
```

Otherwise, Theme UI is Emotion and React based, so see their sections for more
info.

## Guides

### GitHub flavored markdown (GFM)

To support GFM (autolink literals, strikethrough, tables, and tasklists) use
[`remark-gfm`](https://github.com/remarkjs/remark-gfm).
Say we have an MDX file like this:

```mdx
# GFM

## Autolink literals

www.example.com, https://example.com, and contact@example.com.

## Strikethrough

~one~ or ~~two~~ tildes.

## Table

| a | b  |  c |  d  |
| - | :- | -: | :-: |

## Tasklist

* [ ] to do
* [x] done
```

Then do something like this:

```js
import fs from 'fs/promises'
import gfm from 'remark-gfm'
import {compile} from 'xdm'

main()

async function main() {
  console.log(
    String(
      await compile(await fs.readFile('example.mdx'), {remarkPlugins: [gfm]})
    )
  )
}
```

<details>
<summary>Show equivalent JSX</summary>

```js
<h1>GFM</h1>
<h2>Autolink literals</h2>
<p>
  <a href="http://www.example.com">www.example.com</a>,
  <a href="https://example.com">https://example.com</a>, and
  <a href="mailto:contact@example.com">contact@example.com</a>.
</p>
<h2>Strikethrough</h2>
<p>
  <del>one</del> or <del>two</del> tildes.
</p>
<h2>Table</h2>
<table>
  <thead>
    <tr>
      <th>a</th>
      <th align="left">b</th>
      <th align="right">c</th>
      <th align="center">d</th>
    </tr>
  </thead>
</table>
<h2>Tasklist</h2>
<ul className="contains-task-list">
  <li className="task-list-item">
    <input type="checkbox" disabled /> to do
  </li>
  <li className="task-list-item">
    <input type="checkbox" checked disabled /> done
  </li>
</ul>
```

</details>

### Syntax highlighting

There are two ways to accomplish syntax highlighting: at compile time or at
runtime.
Doing it at compile time means much less code is sent down the wire (syntax
highlighting needs a *lot* of code).
Doing it at runtime gives flexibility.

#### Syntax highlighting at compile time

Use either [`rehype-highlight`](https://github.com/rehypejs/rehype-highlight)
(`highlight.js`) or [`@mapbox/rehype-prism`](https://github.com/mapbox/rehype-prism)
(Prism) by doing something like this:

```js
import highlight from 'rehype-highlight'
import {compile} from 'xdm'

main(`~~~js
console.log(1)
~~~`)

async function main(code) {
  console.log(
    String(await compile(code, {rehypePlugins: [highlight]}))
  )
}
```

…you still need to load a relevant style sheet.

<details>
<summary>Show equivalent JSX</summary>

```js
<pre>
  <code className="hljs language-js">
    <span className="hljs-built_in">console</span>.log(
    <span className="hljs-number">1</span>)
  </code>
</pre>
```

</details>

#### Syntax highlighting at run time

Use for example
[`react-syntax-highlighter`](https://github.com/react-syntax-highlighter/react-syntax-highlighter),
by doing something like this:

```js
import SyntaxHighlighter from 'react-syntax-highlighter'
import Post from './example.mdx' // Assumes a bundler is used to compile MDX -> JS.

<Post components={{code}} />

function code({className, ...props}) {
  var match = /language-(\w+)/.exec(className || '')
  return match
    ? <SyntaxHighlighter language={match[1]} PreTag="div" {...props} />
    : <code className={className} {...props} />
}
```

<details>
<summary>Show equivalent JSX</summary>

```js
<pre>
  <div
    className="language-js"
    style={{
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: '#F0F0F0',
      color: '#444'
    }}
  >
    <code style={{whiteSpace: 'pre'}}>
      <span>console.</span>
      <span style={{color: '#397300'}}>log</span>
      <span>(</span>
      <span style={{color: '#880000'}}>1</span>
      <span>)</span>
    </code>
  </div>
</pre>
```

</details>

### Math

Use
[`remark-math`](https://github.com/remarkjs/remark-math/tree/main/packages/remark-math)
and either
[`rehype-katex`](https://github.com/remarkjs/remark-math/tree/main/packages/rehype-katex)
(KaTeX) or
[`rehype-mathjax`](https://github.com/remarkjs/remark-math/tree/main/packages/rehype-mathjax)
(MathJax) by doing something like this:

```js
import katex from 'rehype-katex'
import math from 'remark-math'
import {compile} from 'xdm'

main()

async function main() {
  console.log(
    String(
      // You only need one backslash in an MDX file but because this is JS wrapping it,
      // a double backslash is needed.
      await compile('# $\\sqrt{a^2 + b^2}$', {
        remarkPlugins: [math],
        rehypePlugins: [katex]
      })
    )
  )
}
```

…you still need to load a KaTeX style sheet when using `rehype-katex`.

<details>
<summary>Show equivalent JSX</summary>

```js
<h1>
  <span className="math math-inline">
    <span className="katex">
      <span className="katex-mathml">
        <math xmlns="http://www.w3.org/1998/Math/MathML">…</math>
      </span>
      <span className="katex-html" aria-hidden="true">…</span>
    </span>
  </span>
</h1>
```

</details>

### Footnotes

Use
[`remark-footnotes`](https://github.com/remarkjs/remark-footnotes)
by doing something like this:

```js
import footnotes from 'remark-footnotes'
import {compile} from 'xdm'

main(`Hi[^1]

[^1]: World!`)

async function main(file) {
  console.log(String(await compile(file, {remarkPlugins: [footnotes]})))
}
```

<details>
<summary>Show equivalent JSX</summary>

```js
<p>
  Hi
  <sup id="fnref-1">
    <a href="#fn-1" className="footnote-ref">1</a>
  </sup>
</p>
<div className="footnotes">
  <hr />
  <ol>
    <li id="fn-1">
      World!
      <a href="#fnref-1" className="footnote-backref">↩</a>
    </li>
  </ol>
</div>
```

</details>

### Frontmatter

Frontmatter, typically in YAML format, is frequently combined with markdown.
MDX comes with support for ESM (import/exports) which is a powerful dynamic
alternative.

Say we had this `post.mdx`:

```mdx
export const name = 'World'
export const title = 'Hi, ' + name + '!'

# {title}
```

Used like so:

```js
import Post from './post.mdx' // Assumes a bundler is used to compile MDX -> JS.

console.log(Post.title) // Prints 'Hi, World!'
```

Still, you might prefer frontmatter because it lets you define data that can be
extracted from files *without* (or before) compiling:

Say our `post.mdx` with frontmatter looked like this:

```mdx
---
title: Hi, World!
---

# Hi, World!
```

Then without compiling or evaluating that file the metadata can be accessed like
so:

```js
import fs from 'fs/promises'
import yaml from 'js-yaml'

main()

async function main() {
  console.log(yaml.loadAll(await fs.readFile('example.mdx'))[0]) // Prints `{title: 'Hi, World!'}`
}
```

`xdm` doesn’t understand YAML frontmatter by default but can understand it
using [`remark-frontmatter`](https://github.com/remarkjs/remark-frontmatter):

```js
import fs from 'fs/promises'
import remarkFrontmatter from 'remark-frontmatter'
import {compile} from 'xdm'

main()

async function main() {
  console.log(
    await compile(await fs.readFile('example.mdx'), {
      remarkPlugins: [remarkFrontmatter]
    })
  )
}
```

Now it “works”: the frontmatter is ignored.
But it’s not available from *inside* the MDX.
What if we wanted to use frontmatter from inside the MDX file too?
Like so?

```mdx
---
title: Hi, World!
---

# {frontmatter.title}
```

We can write a remark plugin which turns the YAML frontmatter into an ESM export
to solve it:

```js
import fs from 'fs/promises'
import yaml from 'js-yaml'
import remarkFrontmatter from 'remark-frontmatter'
import visit from 'unist-util-visit'
import {compile} from 'xdm'

main()

async function main() {
  console.log(
    await compile(await fs.readFile('example.mdx'), {
      remarkPlugins: [remarkFrontmatter, remarkMdxExportYaml]
    })
  )
}

function remarkMdxExportYaml() {
  return (tree) => {
    // Find all YAML nodes.
    visit(tree, 'yaml', onyaml)
  }
}

function onyaml(node, index, parent) {
  // Create an estree from the YAML, that looks like:
  // `export const frontmatter = JSON.parse("{…}")`
  // It looks a bit complex.
  // I like using astexplorer (set to JavaScript and espree) to figure out how
  // these things should look.
  var estree = {
    type: 'Program',
    body: [
      {
        type: 'ExportNamedDeclaration',
        declaration: {
          type: 'VariableDeclaration',
          kind: 'const',
          declarations: [
            {
              type: 'VariableDeclarator',
              id: {type: 'Identifier', name: 'frontmatter'},
              init: {
                type: 'CallExpression',
                callee: {
                  type: 'MemberExpression',
                  object: {type: 'Identifier', name: 'JSON'},
                  property: {type: 'Identifier', name: 'parse'}
                },
                arguments: [
                  {
                    type: 'Literal',
                    value: JSON.stringify(yaml.load(node.value))
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }

  // Replace the YAML node with MDX ESM.
  // We’re still in markdown, but by defining `data.estree`, we tell xdm to use
  // that when we’re in JavaScript!
  parent.children[index] = {type: 'mdxjsEsm', value: '', data: {estree}}
}
```

<details>
<summary>Show equivalent JS</summary>

```js
export const frontmatter = JSON.parse('{"title":"Hi, World!"}')

function MDXContent() {
  return <h1>{frontmatter.title}</h1>
}

export default MDXContent
```

</details>

## Differences from `@mdx-js/mdx`

**API** (build):

*   Remove `skipExport` or `wrapExport` options
*   Remove support for `parent.child` combos (`ol.li`)
*   Add support for automatic JSX runtime
*   Add support for non-react classic runtime
*   Add support for source maps
*   Add `evaluate` instead of `runtime` package to eval MDX
*   Remove JSX from output (by default)
*   Default to automatic JSX runtime

**API** (run):

*   No providers by default
*   No runtime at all

**Output**:

*   No `isMDXContent` prop on the `MDXContent` component
*   Missing components throw instead of warn
*   Sandbox: when passing `components: {h1 = () => ...}` that component gets
    used for `# heading` but not for `<h1>heading</h1>`
*   Local components (including layouts) precede over given components
*   Exported things are available from `evaluate`
*   Fix a bug with encoding `"` in attributes

**Input**:

*   ± same as `main` branch of `@mdx-js/mdx`
*   Fix JSX tags to prevent `<p><h1 /></p>`

## Security

MDX is unsafe: it’s a programming language.
You might want to look into using `<iframe>`s with `sandbox`, but security is
hard, and that doesn’t seem to be 100%.
For Node, [vm2](https://github.com/patriksimek/vm2) sounds interesting.
But you should probably also sandbox the whole OS (Docker?), perform rate
limiting, and make sure processes can be killed when taking too long.

## Related

A lot of things are going on in `xdm`: parsing markdown to a syntax tree,
handling JavaScript (and JS) inside that markdown, converting to an HTML syntax
tree, converting *that* to a Js syntax tree, all the while running several
transforms, before finally serializing JavaScript.

Most of the work is done by:

*   [`micromark`](https://github.com/micromark/micromark)
    — Handles parsing of markdown (CommonMark)
*   [`acorn`](https://github.com/acornjs/acorn)
    — Handles parsing of JS (ECMAScript)
*   [`unifiedjs.com`](https://unifiedjs.com)
    — Ties it all together

## License

[MIT][license] © [Titus Wormer][author], Compositor, and Vercel, Inc.

<!-- Definitions -->

[build-badge]: https://github.com/wooorm/xdm/workflows/main/badge.svg

[build]: https://github.com/wooorm/xdm/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/wooorm/xdm.svg

[coverage]: https://codecov.io/github/wooorm/xdm

[downloads-badge]: https://img.shields.io/npm/dm/xdm.svg

[downloads]: https://www.npjs.com/package/xdm

[size-badge]: https://img.shields.io/bundlephobia/minzip/xdm.svg

[size]: https://bundlephobia.com/result?p=xdm

[npm]: https://docs.npjs.com/cli/install

[yarn]: https://classic.yarnpkg.com/docs/cli/add/

[license]: license

[author]: https://wooorm.com

[buffer]: https://nodejs.org/api/buffer.html

[mdxc]: https://github.com/jamesknelson/mdxc

[mdxjs]: https://github.com/mdx-js/mdx

[mdsvex]: https://www.github.com/pngwn/mdsvex

[lit]: https://en.wikipedia.org/wiki/Literate_programming

[commonmark]: https://commonmark.org

[source-map]: https://github.com/mozilla/source-map

[vfile]: https://github.com/vfile/vfile

[remark-plugins]: https://github.com/remarkjs/remark/blob/main/doc/plugins.md#list-of-plugins

[rehype-plugins]: https://github.com/rehypejs/rehype/blob/main/doc/plugins.md#list-of-plugins

[gfm]: https://github.com/remarkjs/remark-gfm

[compile]: #compilefile-options

[eval]: #evaluatefile-options

[integrations]: #integrations

[mdx-syntax]: #mdx-syntax

[mdx-content]: #mdx-content

[use]: #use

[sm]: #optionssourcemapgenerator

[webpack]: #webpack

[rollup]: #rollup

[caveats]: #caveats