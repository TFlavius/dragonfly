import sys
import json
import os

def showconfig(args):
	json.dump(args.config, sys.stdout, indent=1)

def configdoc(args):
	# newline=None, not "", because this hands the text straight to print().
	# CONFIGDOC carries CRLF, and keeping those carriage returns would have
	# print() add its own on Windows and emit CRCRLF. Byte fidelity is what a
	# rewrite pass needs; a pass-through reader needs one native line ending.
	with open(os.path.join(args.root_path, "CONFIGDOC"), "r", encoding="utf_8_sig", newline=None) as f:
		print(f.read())

def setup_subparser(subparsers, config):
	subp = subparsers.add_parser('showconfig', help="Show the config file.")
	subp.set_defaults(func=showconfig)
	subp = subparsers.add_parser('configdoc', help="Show the config options.")
	subp.set_defaults(func=configdoc)
	