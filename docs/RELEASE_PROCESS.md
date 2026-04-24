When you are ready to make a release please follow the instructions below.

- Make sure system has correct new version. Places to check:
  - `package.json` - *version* field
  - `package-lock.json` - *version* field
  - `src\system.json` - *version* field
  - `src\system.json` - *download* field - make sure download link has correct new version number in it
- Make sure `Changelog.md` is updated with all the changes since the last release.
- Make sure `src\templates\dialog\welcome-message.hbs` is updated with all the changes since the last release. This can omit small stuff and should highlight the big changes and new features.
- If you did some changes in Compendiums don't forget to extract data from database to JSON files. You will need to run `npm run packs:databaseToSource` to do that. This is important because LevelDB files are not checked in, so if you don't do this, the changes to compendium data won't be included in the release.
- If now you have changes - push them to origin.
- Create a tag for the new release.Run `git tag -a release-X.Y.Z -m "Release X.Y.Z"` where X.Y.Z is the new version number. Then push the tag to origin with `git push origin release-X.Y.Z`. This will trigger GitHub Action to create a draft release. Please note you have to push the tag to trigger the release, just creating a tag through GitHub UI will not work.
- Go to GitHub and find the draft release. Edit the title and release notes and publish the release. For release notes you can use the commits since last release to create them. You can also use `Changelog.md` file to help you with that.
- After the release is published, go to ACKS Discord's `#vtt-developers` channel and ask `@ArcanistWill` and / or `@Archon` to update Foundry admin with new release paths for both download and manifest. You can find the paths in `src\system.json` file - *download* and *manifest* fields. Make sure to update both of them with correct new version number in the paths. This is important because if you don't do this, users won't be able to see the new release in Foundry and won't be able to download it.
