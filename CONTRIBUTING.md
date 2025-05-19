## Welcome
If you would like to contribute to the project then we welcome all support. 
Please feel free to submit issues to the issue tracker or submit merge requests for code/content changes. 
Approval for such requests involves code and (if necessary) design review by the Maintainers of this repo. 
Please reach out [on the Discord](https://discord.gg/RRsNCSUprY) with any questions.

You can use [acks-vtt-collaboration](https://discord.com/channels/427567650449915904/758364713192521779) for general discussions and [acks-vtt-feedback](https://discord.com/channels/427567650449915904/1318634819713761301) for bug reporting and feedback.

## Development Setup
* Clone the repo into a local folder in your dev environment
* From within the clone's folder, install dependencies with `npm ci`.
* You'll now need to create a symbolic link between the clone's `src` folder and your Foundry's data folder. If you don't know how you can find instructions below. 

### Creating symbolic link on Windows
This can be done by various means. This is one of them:
* Make sure you have [Windows Powershell installed](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell).
* Open terminal as administrator. Make sure you are not using CMD but Windows Powershell or alternative like [Windows Terminal](https://github.com/microsoft/terminal).
* Navigate to Foundry Data Folder. Example: ``
* Run following command `New-Item -ItemType SymbolicLink -Path .\acks\ -Target "d:\projects\js\foundryvtt-acks-core-dev\src\"`. Make sure you use correct Target path to the cloned repo on your machine.
* Now you should have `acks` folder in your Foundry's data folder that is linked to your cloned repo.

### Creating symbolic link on Linux
Check [docs](docs/dev-workflow.md) for an example.

## Code
Here are some guidelines for contributing code to this project.

To contribute code, [fork this project](https://docs.github.com/en/get-started/quickstart/fork-a-repo) and submit a [pull request (PR)](https://docs.github.com/en/get-started/quickstart/contributing-to-projects#making-a-pull-request) against the correct development branch (usually `master`).

### Style
This project uses [Prettier](https://prettier.io/) to apply auto formatting. Please make sure you run it before creating pull request.
You can use following commands:
* `npm run format:check` will check all code for any formatting problems.
* `npm run format:fix` will automatically fix most of them.

If you are using editor like VS Code, Emacs, Vim, WebStorm, etc. - there is a good chance you can [integrate Prettier directly with it](https://prettier.io/docs/editors).

### Linked Issues
Before (or alongside) submitting an PR, we ask that you open a feature request issue. This will let us discuss the approach and prioritization of the proposed change.

If you want to work on an existing issue, leave a comment saying you're going to work on the issue so that other contributors know not to duplicate work. Similarly, if you see an issue is assigned to someone, that member of the team has made it known they are working on it.

When you open an PR it is recommended to [link it to an open issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue). Include which issue it resolves by putting something like this in your description: `Closes #55`

Make sure to NOT COMMIT compendia packs (`src/packs` folder) if you haven't worked on them. If you just run the system from src folder Foundry will create some modifications to database files. There is good chance you don't need to commit those. If you think you do please reach out on Discord.
