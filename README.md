# df2

Build and string tooling for the Opera Dragonfly client.

## Requirements

Python 3.9 or later. Verified on 3.12 and 3.13, which are the interpreters the
Presto revival build environment ships. The tool was written for Python 2 and
was ported in one pass; there is no Python 2 compatibility left.

An external JavaScript minifier is optional. `df2` imports `uglifyjs` if it is
importable and falls back to the bundled `jsminify` otherwise, printing
`failed to import uglifyjs` when it does. Minification is off in the default
build profile either way.

## Installing

```
pip install .
```

or run it from a checkout without installing:

```
PYTHONPATH=/path/to/dragonfly-build-tools python3 -c "from df2.df2 import main; main()" --help
```

## Building the client

From the root of a Dragonfly checkout:

```
df2 build --no-vcs
```

`--no-vcs` builds the working tree as it is checked out. Without it the tool
takes the release path: it requires a clean status, updates the working copy to
the requested tag, and stamps the resulting revision into the build. That is
right for cutting a release and wrong for a submodule or for any ordinary
build.

The output goes to the `dest` directory of the selected profile, `build` by
default. Profiles live in `df2/DEFAULTS` and in an optional configuration file
in the home directory; `df2 configdoc` documents every option.

## Protocol documentation

```
df2 msg-defs <proto file or directory> <destination>
```

A definition the parser cannot read is reported and skipped, and the run exits
non-zero, rather than aborting the walk and silently dropping every file sorted
after it.

## Known limitations

`modules/scope/services/test_service/test_service.proto` in the Presto tree
does not parse. It is the engine's own protocol test fixture and no client
speaks it; every service Dragonfly actually uses generates.
