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

Pushing a tag of the form `v<YYYY>.<MM>.<DD>` publishes a release, for example `v2026.08.21`. The date is the release date, zero padded. A second release on the same day adds a build number, `v2026.08.21.1`, then `.2`, and so on; the unnumbered tag is that day's first, so `.0` is refused as a second spelling of it. The client's releases have been dated rather than semantic since 2011, and nothing here is versioned semantically, so there is no major number that would mean anything. The workflow in `.github/workflows/release.yml` builds the bundle, assembles `dragonfly-<version>.zip` and uploads it; nothing is done by hand, and a tag outside that grammar is refused rather than released.

The archive holds exactly what a browser loads, under a single `dragonfly/` directory, so that unpacking it over an installed client replaces that client rather than merging into it:

    dragonfly/Apache-2.0
    dragonfly/AUTHORS
    dragonfly/client-en.xml
    dragonfly/client.xml
    dragonfly/script/dragonfly.js
    dragonfly/style/dragonfly.css

The licence is named `Apache-2.0` rather than `LICENSE` because that is the name the browser's own bundled copy carries, and the two layouts have to agree for a replacement to be a replacement. `defs/` and `fall-back-urls.json` are build products the client does not read at run time and are left out.

The version is the tag without its leading `v`. It reaches the bundle through `df2`'s `--revision`, so an installed client can be compared against an available one without unpacking anything. Compare the components numerically after splitting on `.` rather than comparing the strings, treating a missing fourth component as 0: the date part happens to sort correctly because it is zero padded, but `<n>` is not, so `2026.08.21.10` sorts before `2026.08.21.2`, and `2026.08.21` sorts after `2026.08.21.1` unless the absent build number is filled in.

**Verify a download against the release's `digest`, not against any checksum in the release notes:**

    gh api repos/TFlavius/dragonfly/releases/latest --jq '.assets[].digest'

That value is computed by GitHub when the asset is uploaded and served from `api.github.com`, while the archive itself is served from a different host. A checksum published alongside an archive by whoever published the archive is attested by the same party and establishes nothing, which is why the workflow deliberately writes none.

Building one tag twice gives the same archive: the bundle's revision stamp is the tagged commit's own date rather than today's, and the archive's timestamps come from that commit rather than from the clock. That guarantee is about this repository, not about the world around it -- a different Python or `zip` version can still produce different bytes, so it holds for rebuilds on the same runner image rather than for all time.

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

