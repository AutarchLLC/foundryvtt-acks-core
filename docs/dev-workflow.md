# Development Workflow

## Overview
After installing the necessary tools, you'll want to set up your working environment and get ready to work on the code.

This document provides:

* A recommended method to set up your development environment for FoundryVTT.
* Examples to set up your environment
* Examples of specific tasks such as: Unpacking a compendium to a set of JSON files so you can update them.

**Before Getting Started**

Please note:

> 1. **You will need at least some prior knowledge of software development;**  
> 1. FoundryVTT development involves HTML, CSS, JavaSCript, Git version control concepts and commands, GitHub, and the Linux command-line (or equivalent on Windows). Not all are needed in every case;  
> 1. We cannot provide detailed procedures for every step;  
> 1. Some steps are summarized but require several actions on your part (e.g. "Set up your local git environment");
> 1. These instructions assume you're running on Linux, either on a desktop install or a virtual environment like VirtualBox.
> 1. An equivalent on Windows is possible using the Windows GitHub tools and the Node,js environment for Windows. You'll need to research this on your own and adapt the instructions as needed.
> 1. The examples here are from `Ubuntu 24.04.1 LTS` running in VirtualBox on Windows 10.

**Table of Contents**

- [Development Workflow](#development-workflow)
  - [Overview](#overview)
  - [Getting the ACKS Sourcecode and Configuring FoundryVTT](#getting-the-acks-sourcecode-and-configuring-foundryvtt)
    - [Example Shell Scripts](#example-shell-scripts)
    - [Workaround for "Chrome Sandbox" issue](#workaround-for-chrome-sandbox-issue)
  - [Checking CSS usage](#checking-css-usage)


## Getting the ACKS Sourcecode and Configuring FoundryVTT

This procedure will focus on the actual steps needed to prepare for ACKS development.

1. Set up your local git environment (author email etc) on your workstation.
1. Set up the connection between your local git environment, and GitHub. There are tutorials and videos on the GitHub site if you need help.
  1. You may have already done some or all of the nextsteps, and if so, skip to the next major section.
  2. Sign up for a GitHub account.
  3. Install Git if needed. If running Linux, you probably already have it.
  4. Create a public/private SSH key pair that will later be used in the connection between you and GitHub.
  5. Load your public SSH key into your GitHub user profile.
1. Make a development working area under your home directory. I named mine **dev**.
1. Clone the ACKS repository into your working area.
1. Following the guidelines in this subsection, install FoundryVTT (one or more versions), *but don't run it yet.*
    1. Prepare a separate directory for each FoundryVTT major version you intend to install (e.g. 11 vs 12 vs 13).  
    For example, I used something like this to install under my home directory:
        1. **`$HOME/foundry/` --** A location under your home directory to contain all Foundry installs
        2. **`$HOME/foundry/11data` --  Data** directory for version 11
        3. **`$HOME/foundry/11program` --  Program** installation directory for version 11
        4. **`$HOME/foundry/12data` --  Data** directory for version 12
        5. **`$HOME/foundry/12program` --  Program** installation directory for version 12
    2. Download the version(s) of FoundryVTT you want.
    3. Install each FoundryVTT major version into the directory you created earlier.
        3. **`$HOME/foundry/11program` --  Program** installation directory for version 11
        5. **`$HOME/foundry/12program` --  Program** installation directory for version 12
    4. Create a shell script containing the command line needed to run each of the FoundryVTT versions.  
    *Create one script per installed version,* for example:
        1. **`$HOME/f11.sh` --  Shell script** to run Foundry11 using data directory foundry/11data
        2. **`$HOME/f12.sh` --  Shell script** to run Foundry12 using data directory foundry/12data
1. Prepare data directory and ACKS game system link
    1. Launch Foundry VTT so that it creates the desired data directory contents.
    2. Perform the "Chrome Sandbox" workaround if you have that error and can't run Foundry.
    3. **Shut down** Foundry.
    4. Create a **symbolic link** inside Foundry's Game Systems directory that points to the ACKS Git repository's __src__ subdirectory.
1. Use shell script to start FoundryVTT again.
1. Confirm that the ACKS Core Game System is listed as an available game system.

I first installed Foundry version 9, then 11, then 12. 

Copy-and-paste commands:
```
mkdir $HOME/dev/
mkdir $HOME/foundry/
mkdir -p $HOME/foundry/11data
mkdir -p $HOME/foundry/12data
mkdir -p $HOME/foundry/11program
mkdir -p $HOME/foundry/11program
# do the foundry install(s)
mkdir $HOME/dev/

```

Directory structure example:
```
* /home/arcanistwill - user home directory
* /home/arcanistwill/dev - all development projects here. Create or clone all Git repos inside here.
    * foundryvtt-acks-core - Git clone of the ACKS II VTT
    * parser - A parsing project I made
    * foundryvtt-acks-calendar - Git clone of a work in progress

* /home/arcanistwill/11foundry/ - location where FoundryVTT version 11 is installed.
* /home/arcanistwill/12foundry/ - location where FoundryVTT version 12 is installed.

* /home/arcanistwill/11foundrydata/ - location of data files used by FoundryVTT v11.
* /home/arcanistwill/12foundrydata/ - location of data files used by FoundryVTT v12.

* /home/arcanistwill/f11.sh - shell script used to launch FoundryVTT v11. You need to create this yourself.
* /home/arcanistwill/f12.sh - shell script used to launch FoundryVTT v12. You need to create this yourself.

```

### Example Shell Scripts

Create text files for scripts then chmod to 755 or 775 so that they're executable.

```shell
arcanistwill@developer:~$ ls -l f*.sh
-rwxrwxr-x 1 arcanistwill arcanistwill 109 Mar 23  2024 f9.sh
-rwxrwxr-x 1 arcanistwill arcanistwill 113 Mar 23  2024 f11.sh
-rwxrwxr-x 1 arcanistwill arcanistwill 110 Feb  8 09:35 f12.sh
```

```
arcanistwill@developer:~$ cat f9.sh 
#!/bin/bash

/home/arcanistwill/foundryvtt/foundryvtt --port=30000 --dataPath=/home/arcanistwill/foundrydata
```

```
arcanistwill@developer:~$ cat f12.sh 
#!/bin/bash

/home/arcanistwill/12foundry/foundryvtt --port=30000 --dataPath=/home/arcanistwill/12foundrydata
```

```
arcanistwill@developer:~$ cat f11.sh 
#!/bin/bash

/home/arcanistwill/11foundryvtt/foundryvtt --port=30000 --dataPath=/home/arcanistwill/11foundrydata
```

### Workaround for "Chrome Sandbox" issue

I think when I was running version 9, that was on an earlier Ubuntu befire upgrading, then when running 11 and 12 I had this problem.

The workaround was needed for version 11, and then again later for version 12.

```shell
sudo chown root /home/arcanistwill/11foundryvtt/chrome-sandbox
sudo chmod 4755 /home/arcanistwill/11foundryvtt/chrome-sandbox

sudo chown root:$(whoami) /home/arcanistwill/12foundry/chrome-sandbox
sudo chmod 4755 /home/arcanistwill/12foundry/chrome-sandbox
```

## Checking CSS usage

Two tools help find rules in the system stylesheets (`src/styles/`) that nothing uses any more. Their output goes to
`css-usage/` (gitignored).

**Static scan.** `scripts/css-usage.mjs` looks up every class and id a selector needs in the system
templates, modules and compendium HTML, and in Foundry core (`foundry/`, see `AGENTS.md`). A rule
whose selector needs a token found nowhere is reported as dead. It also lists unused `@keyframes`,
`@font-face` and custom properties, and selectors declared in more than one block.

```shell
node scripts/css-usage.mjs
```

The report is `css-usage/report.md`. The scan can't tell whether a rule built from common names
(`.sheet`, `.item`, `.tab`) still matches the current markup; that needs runtime data.

**Runtime coverage.** `scripts/css-usage-tracker.js` records which selectors match the live DOM.
The coverage tour in `e2e/tests/css-coverage.spec.mjs` injects it and opens every sheet and tab,
item sheet, app, dialog, chat card, the combat tracker and the token HUD, in light and dark theme.
It is skipped in the normal `npm run test:e2e` run:

```shell
ACKS_CSS_COVERAGE=1 npx playwright test -c e2e css-coverage
```

It writes `css-usage/runtime.json`; run `node scripts/css-usage.mjs` afterwards and the report lists
rules that never matched. The tour doesn't reach every state (critical hits, expanded summaries, an
empty party), so check each rule against the templates before deleting it.

At every step the tour also compares the computed style of every element under the stylesheets from
git ref `ACKS_CSS_BASE` (default `master`) and under the working copy, and fails on any difference
(details in `css-usage/style-diff.json`). Use it to confirm a cleanup changes nothing visible.

To record a real world instead, paste `scripts/css-usage-tracker.js` into the browser console, use
the game, then run `acksCssUsage.download()` and pass the saved file to `node scripts/css-usage.mjs`.

Chat card rules are kept even when no template uses their classes any more: chat messages store
their rendered HTML, so old messages in existing worlds still use them.
