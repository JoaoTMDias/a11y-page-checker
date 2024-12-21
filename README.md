a11y-page-checker
=================

A tool perform accessibility testing and reports


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/a11y-page-checker.svg)](https://npmjs.org/package/a11y-page-checker)
[![Downloads/week](https://img.shields.io/npm/dw/a11y-page-checker.svg)](https://npmjs.org/package/a11y-page-checker)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g a11y-page-checker
$ a11y-page-checker COMMAND
running command...
$ a11y-page-checker (--version)
a11y-page-checker/0.0.0 darwin-arm64 node-v20.11.0
$ a11y-page-checker --help [COMMAND]
USAGE
  $ a11y-page-checker COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`a11y-page-checker hello PERSON`](#a11y-page-checker-hello-person)
* [`a11y-page-checker hello world`](#a11y-page-checker-hello-world)
* [`a11y-page-checker help [COMMAND]`](#a11y-page-checker-help-command)
* [`a11y-page-checker plugins`](#a11y-page-checker-plugins)
* [`a11y-page-checker plugins add PLUGIN`](#a11y-page-checker-plugins-add-plugin)
* [`a11y-page-checker plugins:inspect PLUGIN...`](#a11y-page-checker-pluginsinspect-plugin)
* [`a11y-page-checker plugins install PLUGIN`](#a11y-page-checker-plugins-install-plugin)
* [`a11y-page-checker plugins link PATH`](#a11y-page-checker-plugins-link-path)
* [`a11y-page-checker plugins remove [PLUGIN]`](#a11y-page-checker-plugins-remove-plugin)
* [`a11y-page-checker plugins reset`](#a11y-page-checker-plugins-reset)
* [`a11y-page-checker plugins uninstall [PLUGIN]`](#a11y-page-checker-plugins-uninstall-plugin)
* [`a11y-page-checker plugins unlink [PLUGIN]`](#a11y-page-checker-plugins-unlink-plugin)
* [`a11y-page-checker plugins update`](#a11y-page-checker-plugins-update)

## `a11y-page-checker hello PERSON`

Say hello

```
USAGE
  $ a11y-page-checker hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ a11y-page-checker hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/joaotmdias/a11y-page-checker/blob/v0.0.0/src/commands/hello/index.ts)_

## `a11y-page-checker hello world`

Say hello world

```
USAGE
  $ a11y-page-checker hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ a11y-page-checker hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/joaotmdias/a11y-page-checker/blob/v0.0.0/src/commands/hello/world.ts)_

## `a11y-page-checker help [COMMAND]`

Display help for a11y-page-checker.

```
USAGE
  $ a11y-page-checker help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for a11y-page-checker.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.20/src/commands/help.ts)_

## `a11y-page-checker plugins`

List installed plugins.

```
USAGE
  $ a11y-page-checker plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ a11y-page-checker plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/index.ts)_

## `a11y-page-checker plugins add PLUGIN`

Installs a plugin into a11y-page-checker.

```
USAGE
  $ a11y-page-checker plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into a11y-page-checker.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the A11Y_PAGE_CHECKER_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the A11Y_PAGE_CHECKER_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ a11y-page-checker plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ a11y-page-checker plugins add myplugin

  Install a plugin from a github url.

    $ a11y-page-checker plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ a11y-page-checker plugins add someuser/someplugin
```

## `a11y-page-checker plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ a11y-page-checker plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ a11y-page-checker plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/inspect.ts)_

## `a11y-page-checker plugins install PLUGIN`

Installs a plugin into a11y-page-checker.

```
USAGE
  $ a11y-page-checker plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into a11y-page-checker.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the A11Y_PAGE_CHECKER_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the A11Y_PAGE_CHECKER_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ a11y-page-checker plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ a11y-page-checker plugins install myplugin

  Install a plugin from a github url.

    $ a11y-page-checker plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ a11y-page-checker plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/install.ts)_

## `a11y-page-checker plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ a11y-page-checker plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ a11y-page-checker plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/link.ts)_

## `a11y-page-checker plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ a11y-page-checker plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ a11y-page-checker plugins unlink
  $ a11y-page-checker plugins remove

EXAMPLES
  $ a11y-page-checker plugins remove myplugin
```

## `a11y-page-checker plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ a11y-page-checker plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/reset.ts)_

## `a11y-page-checker plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ a11y-page-checker plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ a11y-page-checker plugins unlink
  $ a11y-page-checker plugins remove

EXAMPLES
  $ a11y-page-checker plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/uninstall.ts)_

## `a11y-page-checker plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ a11y-page-checker plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ a11y-page-checker plugins unlink
  $ a11y-page-checker plugins remove

EXAMPLES
  $ a11y-page-checker plugins unlink myplugin
```

## `a11y-page-checker plugins update`

Update installed plugins.

```
USAGE
  $ a11y-page-checker plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.23/src/commands/plugins/update.ts)_
<!-- commandsstop -->
