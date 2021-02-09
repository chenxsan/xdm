import * as provider from '@mdx-js/react'
import React from 'react'
import * as runtime from 'react/jsx-runtime.js'
import {renderToStaticMarkup} from 'react-dom/server.js'
import test from 'tape'
import {evaluate, evaluateSync} from '../index.js'

test('xdm (evaluate)', async function (t) {
  t.throws(
    function () {
      evaluateSync('a')
    },
    /Expected `Fragment` given to `evaluate`/,
    'should throw on missing `Fragment`'
  )

  t.throws(
    function () {
      evaluateSync('a', {Fragment: runtime.Fragment})
    },
    /Expected `jsx` given to `evaluate`/,
    'should throw on missing `jsx`'
  )

  t.throws(
    function () {
      evaluateSync('a', {Fragment: runtime.Fragment, jsx: runtime.jsx})
    },
    /Expected `jsxs` given to `evaluate`/,
    'should throw on missing `jsxs`'
  )

  t.equal(
    renderToStaticMarkup(
      React.createElement((await evaluate('# hi!', runtime)).default)
    ),
    '<h1>hi!</h1>',
    'should evaluate'
  )

  t.equal(
    renderToStaticMarkup(
      React.createElement(evaluateSync('# hi!', runtime).default)
    ),
    '<h1>hi!</h1>',
    'should evaluate (sync)'
  )

  var mod = await evaluate('export const a = 1\n\n{a}', runtime)

  t.equal(
    renderToStaticMarkup(React.createElement(mod.default)),
    '1',
    'should support an `export` (1)'
  )

  t.equal(mod.a, 1, 'should support an `export` (2)')

  mod = await evaluate('export function a() { return 1 }\n\n{a()}', runtime)

  t.equal(
    renderToStaticMarkup(React.createElement(mod.default)),
    '1',
    'should support an `export function` (1)'
  )

  t.equal(mod.a(), 1, 'should support an `export function` (2)')

  mod = await evaluate(
    'export class A { constructor() { this.b = 1 } }\n\n{new A().b}',
    runtime
  )

  t.equal(
    renderToStaticMarkup(React.createElement(mod.default)),
    '1',
    'should support an `export class` (1)'
  )

  t.equal(new mod.A().b, 1, 'should support an `export class` (2)')

  mod = await evaluate('export const a = 1\nexport {a as b}\n\n{a}', runtime)

  t.equal(
    renderToStaticMarkup(React.createElement(mod.default)),
    '1',
    'should support an `export as` (1)'
  )

  t.equal(mod.a, 1, 'should support an `export as` (2)')
  t.equal(mod.b, 1, 'should support an `export as` (3)')

  t.equal(
    renderToStaticMarkup(
      React.createElement(
        (
          await evaluate(
            'export default function Layout({components, ...props}) { return <section {...props} /> }\n\na',
            runtime
          )
        ).default
      )
    ),
    '<section><p>a</p></section>',
    'should support an `export default`'
  )

  t.throws(
    function () {
      evaluateSync('export {a} from "b"', runtime)
    },
    /Cannot use `export … from` in contained MDX/,
    'should throw on an export from'
  )

  t.throws(
    function () {
      evaluateSync('export * from "a"', runtime)
    },
    /Cannot use `export \* from` in contained MDX/,
    'should throw on an export all from'
  )

  t.throws(
    function () {
      evaluateSync('import {a} from "b"', runtime)
    },
    /Cannot use `import` in contained MDX/,
    'should throw on an import'
  )

  t.throws(
    function () {
      evaluateSync('import a from "b"', runtime)
    },
    /Cannot use `import` in contained MDX/,
    'should throw on an import default'
  )

  t.equal(
    renderToStaticMarkup(
      React.createElement((await evaluate('<X/>', {...runtime})).default, {
        components: {
          X() {
            return React.createElement('span', {}, '!')
          }
        }
      })
    ),
    '<span>!</span>',
    'should support a given components'
  )

  t.equal(
    renderToStaticMarkup(
      React.createElement(
        provider.MDXProvider,
        {
          components: {
            X() {
              return React.createElement('span', {}, '!')
            }
          }
        },
        React.createElement(
          (await evaluate('<X/>', {...runtime, ...provider})).default
        )
      )
    ),
    '<span>!</span>',
    'should support a provider w/ `useMDXComponents`'
  )

  t.end()
})