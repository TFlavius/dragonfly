#!/usr/bin/env sh
# Build the Dragonfly client into ./build.
#
# This is the one supported way to build the client. It runs df2, which lives
# in TFlavius/dragonfly-build-tools and needs Python 3.9 or later:
#
#   pip install git+https://github.com/TFlavius/dragonfly-build-tools
#
# or, from a checkout of that repository without installing:
#
#   PYTHONPATH=/path/to/dragonfly-build-tools DF2="python3 -m df2.df2" ./build.sh
#
# --no-vcs builds the working tree as it is checked out. Without it df2 takes
# the release path: it requires a clean status and updates the working copy to
# a tag first, which is right for cutting a release and wrong for an ordinary
# build or a submodule. Pass any further df2 arguments after the script name.
set -eu

# Build the repository this script lives in, not whatever directory the caller
# happened to be in. df2's profile carries the relative paths "src" and
# "build", so without this the script only works from the repository root and
# fails elsewhere with a traceback naming a src directory that is not ours.
#
# readlink resolves a symbolic link to the script, so that a link on a PATH
# directory still builds the right tree; where it is unavailable or fails this
# falls back to the plain behaviour.
cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")"

DF2="${DF2:-df2}"

# Only a bare command can be probed; DF2 may be a whole invocation, as in the
# header above, and then df2 reports its own absence clearly enough.
case "$DF2" in
  *\ *) ;;
  *) command -v "$DF2" >/dev/null 2>&1 || MISSING=1 ;;
esac

if [ -n "${MISSING:-}" ]; then
  echo "df2 was not found." >&2
  echo "Install it from https://github.com/TFlavius/dragonfly-build-tools," >&2
  echo "or point PYTHONPATH at a checkout of it and set DF2, as in the header." >&2
  exit 1
fi

# shellcheck disable=SC2086
exec $DF2 build --no-vcs "$@"
