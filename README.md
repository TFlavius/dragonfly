# Opera Dragonfly

## Directories

`src`: source code for dragonfly client

`docs`: documentation that is not auto-generated

`tools`: tools needed for building/distributing/testing

## Developing Dragonfly

When working on the code base you should use the `dragonkeeper`
tool. See [dragonkeeper's README](https://github.com/operasoftware/dragonkeeper/blob/master/README.md)
for more information.

## Building Dragonfly

**Note:** It is not necessary to build Dragonfly during development. See above.

    ./build.sh

That is the one supported way to build the client. It produces `build/`, in
which the roughly three hundred scripts and stylesheets of `src/` have become
one of each.

Nothing has to be installed first. The build tool, `df2`, lives in
`tools/df2` in this repository and needs Python 3.9 or later; `build.sh` puts it
on the path itself.

`tools/` also holds the Python 2 tooling that came before `df2`. It is kept for
reference and nothing runs it; see `tools/README.md`.

## Releasing Dragonfly

Pushing a tag of the form `v<version>` publishes a release. The workflow in
`.github/workflows/release.yml` builds the bundle, assembles
`dragonfly-<version>.zip` and uploads it; nothing is done by hand.

The archive holds exactly what a browser loads, under a single `dragonfly/`
directory, so that unpacking it over an installed client replaces that client
rather than merging into it:

    dragonfly/Apache-2.0
    dragonfly/AUTHORS
    dragonfly/client-en.xml
    dragonfly/client.xml
    dragonfly/script/dragonfly.js
    dragonfly/style/dragonfly.css

The licence is named `Apache-2.0` rather than `LICENSE` because that is the name
the browser's own bundled copy carries, and the two layouts have to agree for a
replacement to be a replacement. `defs/` and `fall-back-urls.json` are build
products the client does not read at run time and are left out.

The version is the tag without its leading `v`. It reaches the bundle through
`df2`'s `--revision`, so an installed client can be compared against an
available one without unpacking anything.

**Verify a download against the release's `digest`, not against any checksum in
the release notes:**

    gh api repos/TFlavius/dragonfly/releases/latest --jq '.assets[].digest'

That value is computed by GitHub when the asset is uploaded and served from
`api.github.com`, while the archive itself is served from a different host. A
checksum published alongside an archive by whoever published the archive is
attested by the same party and establishes nothing, which is why the workflow
deliberately writes none.

The archive is reproducible: its timestamps come from the tagged commit rather
than from the clock, so building the same tag again yields the same bytes.

## Running test builds of dragonfly

Open [opera:config#DeveloperTools|DeveloperToolsURL](opera:config#DeveloperTools|DeveloperToolsURL) and set the URL to the
path to the Dragonfly build to use.

## Updating translations

**NOTE**: While translated strings are placed in the `src/ui-strings`
directory, that is not the authoritative location for translations.
Strings are kept in Opera's translation infrastructure, which uses .po
files. These are not publicly available.

As a consequence, we can not integrate string fixes from volunteers by
simply merging new versions of the JavaScript string files.

Translations currently offered:
  Беларуская (be), Български (bg), Česky (cs), Deutsch (de), U.S. English (en),
  British English (en-GB), Español (España) (es-ES), Español (Latinoamérica) (es-LA),
  Eesti keel (et), Français (fr), Français Canadien (fr-CA), Frysk (fy), Gàidhlig (gd),
  Magyar (hu), Bahasa Indonesia (id), Italiano (it), 日本語 (ja), ქართული (ka),
  македонски јазик (mk), Norsk bokmål (nb), Nederlands (nl), Norsk nynorsk (nn),
  Polski (pl), Português (pt), Português (Brasil) (pt-BR), Română (ro), Русский язык (ru),
  Slovenčina (sk), српски (sr), Svenska (sv), Türkçe (tr), Українська (uk), 简体中文 (zh-cn),
  繁體中文 (zh-tw)

