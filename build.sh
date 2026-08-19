#!/usr/bin/env sh
# Build the Dragonfly client into ./build.
#
# This is the one supported way to build the client. It runs df2, which lives
# in tools/df2 in this repository and needs Python 3.9 or later. Nothing has to
# be installed first.
#
# --no-vcs builds the working tree as it is checked out. Without it df2 takes
# the release path: it requires a clean status and updates the working copy to
# a tag first, which is right for cutting a release and wrong for an ordinary
# build or a submodule. Pass any further df2 arguments after the script name.
#
# DF2 overrides the invocation, for testing another copy of the tool.
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

# The tool that ships with this checkout has to win. An existing PYTHONPATH is
# kept, but after ours: "PYTHONPATH=/path/to/dragonfly-build-tools" is what this
# repository's own README told people to export until df2 moved in here, and an
# entry ahead of ours would let that stale copy shadow tools/df2.
#
# Python splits PYTHONPATH on the platform's separator, which is ";" on Windows
# and ":" everywhere else. Joining with the wrong one turns the whole variable
# into a single path that does not exist, and the build dies in
# ModuleNotFoundError.
case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*|Windows*) path_separator=';' ;;
  *)                             path_separator=':' ;;
esac
PYTHONPATH="$PWD/tools/df2${PYTHONPATH:+$path_separator$PYTHONPATH}"
export PYTHONPATH
DF2="${DF2:-python3 -m df2.df2}"

# shellcheck disable=SC2086
exec $DF2 build --no-vcs "$@"
