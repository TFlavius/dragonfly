# To add a new command import a module which exposes a method
#
#    def setup_subparser(subparsers, config):
#
# All modules will be scanned for such a method.

import os
import sys
import argparse
import json
from . import js2db
from . import jssort
from . import po2js
from . import db2js
from . import verifyids
from . import showconfig
from . import build
from . import cleanrepo
from . import normws
from . import codegen
from .codegen import msgdefs
from .codegen import jsclasses
from .codegen import scopedoc

SOURCE_ROOT = os.path.dirname(os.path.abspath(__file__))

def deep_update(target, src):
    for key in src.keys():
        if type(src[key]) == type({}):
            if not key in target:
                target[key] = {}
            deep_update(target[key], src[key])
        else:
            target[key] = src[key]

def get_config():
    config = {}
    with open(os.path.join(SOURCE_ROOT, "DEFAULTS"), "r") as f:
        config.update(json.loads(f.read()))
    home = os.environ.get('HOME') or os.environ.get('HOMEPATH')
    if home:
        for name in ['df2.ini', '.df2', 'DF2', 'df2.cfg']:
            path = os.path.abspath(os.path.join(home, name))
            if os.path.isfile(path):
                with open(path, "r") as f:
                    deep_update(config, json.loads(f.read()))
                break
    return config

def main():
    description = """Tool collection to build Opera Dragonfly and handle
    language strings. The tool uses an optional configuration file in the home
    directory ("df2.ini", ".df2", "DF2" or "df2.cfg"). Use 'df2 configdoc'
    to see all options."""

    parser = argparse.ArgumentParser(prog='df2', description=description)
    config=get_config()
    parser.set_defaults(config=config)
    parser.set_defaults(root_path=SOURCE_ROOT)
    subparsers = parser.add_subparsers()
    # The codegen submodules are reachable both as module globals and as
    # attributes of the package, so collect them once. Registering a
    # subcommand twice makes argparse raise on the duplicate name.
    candidates = list(globals().values())
    candidates.extend(getattr(codegen, name) for name in dir(codegen))
    seen = set()
    for module in candidates:
        if id(module) in seen:
            continue
        seen.add(id(module))
        try: setup = getattr(module, "setup_subparser")
        except AttributeError: continue
        setup(subparsers, config)
    args = parser.parse_args()
    args.func(args)

if __name__ == '__main__':
    main()
