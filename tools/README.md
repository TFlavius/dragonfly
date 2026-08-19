# tools

The build and string tooling that predates `df2`. **Nothing here is supported
and nothing here is run by the build.**

It is Python 2 and will not run on any interpreter this project uses. It is
kept because parts of it have no successor and because it records how the
client was built and released while Opera maintained it.

`build.sh` used to call `dfbuild.py`. It calls `df2` now, which lives in
[TFlavius/dragonfly-build-tools](https://github.com/TFlavius/dragonfly-build-tools),
runs on Python 3 and is the only supported way to build the client.

## Superseded by df2

| Here | In df2 |
| --- | --- |
| `dfbuild.py` | `df2 build` |
| `po2js.py` | `df2 po2js` |
| `db2js.py` | `df2 db2js` |
| `jsminify.py` | bundled inside `df2` |
| `createmanifests.py` | `df2` carries its own copy |

## No successor

`dfstrings.py`, `js2strings.py`, `find_unused_strings.py`, `stringdiff.py` and
`verifyplaceholders.py` worked on Opera's internal translation database, which
was never published. `make_builds.py` drove the release infrastructure that
published to `dragonfly.opera.com`. `puint.py` checked interface conformance
between the client and the scope service definitions. `get-interfaces/` fetched
those definitions from a running Opera. `hgappext.py` is a Mercurial extension,
left over from before the move to git. `remove-mac-check.py` stripped a
platform check out of already-published builds; the check itself was removed
from the sources in 2010.

Anything from this list that turns out to be wanted again should be rewritten
for Python 3 in `df2` rather than revived here.
