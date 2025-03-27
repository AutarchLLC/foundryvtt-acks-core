# Changelog

This is the change history for the FoundryVTT ACKS II core system module (search for *acks* in the Foundry installer).

## Release 12.2.5 - Mainly a Bugfix Release

### Updates

- **2025-03-22:** Added first draft of developer information as ./notes/tools.md
- **2025-03-22:** Update README.md:  
  1. Add Table of Contents.
  2. Add instructions for downgrading (reverting) to older releases.

### Bugfixes

- **2025-03-26:** Implements change to deal with ActiveEffect from Items
- **2025-03-26:** Fix MEL/DIS
- **2025-03-26:** Fix wrong table usage
- **2025-03-25:** Prevent issue with out of bounds values
- **2025-03-21:** Update actions
- **2025-03-21:** Update Changelog for release.  
Rename Changelog.txt to Markdown (Changelog.md).

## Release 12.2.4 - Updates to Initiative and Surprise

### Updates
- Move the remaining ACKS (original) packs into an ACKS Rulebook folder. This separates each of the ACKS content areas by publication (e.g. Original Rules, Revised Rules, Judges Journal, Monstrous Manual, and so on)
- Revise scrolling for inventory / encumbrance
- Remove "heavy items" concept

### Bugfixes
- Update surprise calculations to correctly incorporate Surprise Others / Avoid Surprise. These now work exactly as described in the ACKS II RR page
- Update Monster character sheet to add the fields for Surprise Others / Avoid Surprise.
- Allow grouping of Player Characters (friendlies).
- Fix initiative
- Fix missing backgrounds in some dialog tabs

### Change List

- **2025-03-17:** Fix surprise alignement for monsters
- **2025-03-16:** Add new surpise fields to monster
- **2025-03-16:** Simplify text used for Surprise results. Fix calculation for Surprise Others modifier.
- **2025-03-13:** Take care of surprise others/avoir surprise in surprise manager, #101
- **2025-02-23:** Remove/Hide treasure flag management (ie heavy items), #100
- **2025-02-22:** Fix item 1 of issue #99
- **2025-02-22:** Fix item 4 of issue #99
- **2025-02-18:** Allow PC grouping, fix item 5 of #99
- **2025-02-17:** Fix group initiative, with lowest init bonus
- **2025-02-15:** Move the remaining ACKS original packs into an ACKS Rulebook folder. This separates ACKS original book from ACKS II books. Closes #98.
- **2025-02-15:** In English, the term Armor is preferred over Armors.
- **2025-02-15:** Fix missing background color for item sheet tabs.
- **2025-02-08:** Ticket #97 - Fix initiative from players
- **2025-02-08:** Ticket #97 - Fix combat buttons
- **2025-02-08:** Ticket #97 - Fix warning with active effect
- **2025-02-08:** Fix #90 - Encumbrance outside of scroll area
- **2025-02-08:** Fix #90 - Encumbrance outside of scroll area
- **2025-02-08:** Fix #96 - Add additionnal check before migration
- **2025-02-08:** Fix #96 - Add additionnal check before migration
- **2025-01-16:** Align headers for weapons list, Fix #92
- **2025-01-16:** Move inventory bar out of scrolling zone, Fix #90
- **2025-01-09:** Add correct versions of Quintain icons.
- **2025-01-09:** Add the last missing Adventuring Equipment icons.

git log --pretty=changelog 0039810e5637b9c87683ee13be9e6213193b5424..84c67bdb3dc10116e0dee942d8c76903c4bc0d81

## Release 12.2.3 - Compendium Updates

### Updates
- Add new ACKS II Adventuring Equipment table.
- Add new ACKS II Clothing table and provide item subtype to allow Clothing vs Equipment.
- Revise compendium folder layout and colors
- Add new icons

### Bugfixes
- Replace image backgrounds with colored backgrounds for tabs
- Drag and drop issues
- Improve default character sheet size

### Change List

- **2024-12-31:** ACKS II Adventuring Equipment: cleanup for issue #24.  
Remove obsoleted equipment items & fix folder names.
- **2024-12-31:** Add ACKS II Adventuring Equipment, updated equipment for issue #24.  
  1. New acks-adventuring-equipment compendium pack as a separate pack file.
  2. Updated Equipment folder layout to include the new compendium pack.
- **2024-12-31:** Add acks-clothing compendium support for issue #25.  
  1. Add new icons from game-icons.net into a subdirectory game-icons.
     This was done to make it easier to track which came from where.
  2. Add acks-clothing compendium pack as a separate pack file.
  3. Update Equipment folder layout to include Clothing.
  4. Add background banner images for compendia.
- **2024-12-27:** Change bg color for tabs
- **2024-12-27:** Fix for item drag&drop between actors
- **2024-12-27:** Fix default width for monster
- **2024-12-27:** Apply changes

Git commit ID: 0039810e5637b9c87683ee13be9e6213193b5424

## Release 12.2.2 - Bugfix Release

### Updates
None

### Bugfixes
- Fix a regression in character-creation workflow.

### Change List

- **2024-12-25:** Fix roll for new characters

Git commit ID: be9d090c77fc4b92be9699e5cca30f4642684b35

## Release 12.2.1 - Bugfix Release

### Updates
- Add / restore support for the Polyglot module that had worked in ACKS (original).
- Add Base Healing Rate (BHR) support

### Bugfixes

- Fix the item weights to match ACKS II (most of them, some were overlooked)
- Prevent Hireling from being set to itself as its own Hireling
- Character sheet improvements
- Set reasonable default values when generating new characters
- Fix "pay wages"

### Changes

- **2024-12-23:** Fix item #15 of issue #85
- **2024-12-20:** Fix default values + set default language + set literate #85
- **2024-12-20:** Add Polyglot support
- **2024-12-19:** Fixing weights for Armor, Equipment, and Weapons.
- **2024-12-19:** Fix tooltip from surprise/init bonus for issue #85
- **2024-12-19:** Fix wages button for issue #85
- **2024-12-19:** Fix step 6 in #86 : treasure type E
- **2024-12-19:** Fix step 5 in #85 : key to skip dialog
- **2024-12-19:** Fix step 11 in #85
- **2024-12-17:** Fix henchan being drop on itself

Git commit ID: 72d583b058ae3f68f54bd9d14781355644259bd9

## Release 12.2.0 - Update for ACKS II

Major drop of ACKS II updates and corrections

### New Features
* ACKS II Character Sheet Updates
   * Many visual enhancements to the actor sheet
   * Favorites items
   * Proper saves name
   * Better organization of fields for efficient access
* ACKS II Hireling & Henchmen Support
   * New character sheet tab
   * Set this using the Tweaks menu
* ACKS II Coins and Money
   * Can track individual counts of each type of coin (cp, sp, gp, etc.)
   * Coins carried are tracked separately from coins in the bank
   * Allows adding user-defined money types
* ACKS II Languages
   * Added all languages from ACKS II Revised Rulebook
   * Languages are now separate Items to add to the character sheet
   * New Language compendium (in ACKS II Revised Rulebook / Setting)
* Active Effects
   * Added new character sheet tab for Active Effects.

### Improvements and Updates
* Compendium Organization
   * Sections reorganized to match ACKS II Rulebook structure
   * Most sections are still original content, not yet ACKS II
* Combat Tracker
   * Improved the initiative-order sorting for combat tracker
* Weight and Encumbrance
   * Now calculated in Stone and Item.
   * Converted all weights to stones.
   * Modified the weight tracking for consumables like arrows, spikes, torches.

### Data that is Automatically Migrated
This information will be automatically updated as part of the update.
* Character statistics
* Saving throws
* Weights
* Encumbrance
* Movement Rates

### Manual Updates: Things you need to do
After the upgrade, you will need to check and update the following.
* Languages: Check if migrated
* Gold / Money
* Encumbrance
* Movement Rates: You may need to manually set if it's not based on encumbrance.

### Change List

Git commit ID: a33d4441bc8c248244f36c1273875261688ae056

- **2024-12-17:** Add welcome message
- **2024-12-17:** Sync compendiums with branch
- **2024-12-17:** Resolve conflicts
- **2024-12-16:** Updates to ACKS Compendium layout.  
  1. Updated the colors used
  2. Moved game journal
  3. Added all ACKS languages from rulebook
- **2024-12-14:** Fix climb/steamth values from #81
- **2024-12-09:** Fix task 3 of issue #81
- **2024-12-09:** Rework char creation message, as per #81A
- **2024-12-01:** Change saves order for monster sheets + dice #81
- **2024-12-01:** Closing issue #7.  
  1. Make the character-generator dialog smaller.
  2. Changed the definition in English file, added to Spanish file.
- **2024-11-26:** Minor updates
- **2024-11-25:** Add language icon
- **2024-11-24:** Updated graphical icon attributions.
  1. Revised README.md to add the proper attribution for Flaticon.com usage.
  2. Reorganized that section of the readme.  
- **2024-11-24:** Fix pay wages order, cf #64
- **2024-11-23:** Fix task #2 of issue #80
- **2024-11-23:** Fix task #1 of issue #80
- **2024-11-23:** Fix issue #69
- **2024-11-14:** Fix folder colors
- **2024-11-10:** Add clothing support for equipment, #25
- **2024-11-10:** Manage languages during upgrade, #79
- **2024-11-10:** Manage languages again, #70
- **2024-11-05:** Add compendiums
- **2024-11-04:** Change font size
- **2024-11-02:** Update health and shield icons
- **2024-11-01:** Change font as per  #78
- **2024-11-01:** Change H1 actor font #72, and apply it to item title also
- **2024-10-31:** Remove slashes for fixing #77
- **2024-10-31:** Merge pull request #75 from wyatt-kinkade/monster-hp-calculation-fixes  
Update entity.js to resolve issue #74
- **2024-10-30:** Update entity.js  
Fix to HP Calculation Returns
- **2024-10-30:** Enhance UI with font + back color, #69.  
Manages #73 with packed items weight
- **2024-10-29:** Ehnahce actor sheet
- **2024-10-28:** Fix initiative ordering and loop
- **2024-10-27:** Use new compendium structure
- **2024-10-27:** Various enhancements for #70, #69, #68, #64
- **2024-10-27:** Implements modification for issue #68
- **2024-10-26:** Remove compendium back and minor changes for hirelings, #66 and #67
- **2024-10-25:** Manage Hireling quantity feature, #66
- **2024-10-12:** No more display loyalty results, cf #63
- **2024-10-12:** Fix payment order #64
- **2024-10-12:** Implements all other fix for #61
- **2024-10-12:** Remove default Foundry compendium background images #61
- **2024-10-12:** Implements all remaining requests from ticket #63
- **2024-10-12:** Implements fix for point 1, 2 and 3 in ticket  #63
- **2024-10-12:** Implements fix for item of of ticket #63 (ie clear warning message)
- **2024-10-12:** Implements changes for tickets #64
- **2024-10-06:** Add favorite/scores rolls from the token HUD, #49
- **2024-10-06:** Fix money/encumbrance/movement issues, cf #57 and #58
- **2024-10-01:** Enhance Henchman management, add money items, wages payment, #47
- **2024-10-01:** Enhance Henchman management, as well as weapons display, cf #47
- **2024-09-29:** Firx roll call, #57
- **2024-09-29:** Fix proficiency changes, #48
- **2024-09-29:** Sheet rework ongoing, #47
- **2024-09-25:** Fix for issue #57: Fix treasure roll table warning.
- **2024-09-25:** Merge pull request #56 from Exile1043/fix/55-treasure-rolltable-button-unresponsive  
Fix #55 treasure rolltable button unresponsive. Reviewed change and looks good.
- **2024-09-25:** Merge pull request #54 from wyatt-kinkade/monster-sheet-saving-throw-adjustments  
Monster sheet saving throw adjustments.  
This corrects errors in the saving throw targets and changes the displayed field order.
- **2024-09-25:** Fix #55 treasure rolltable button unresponsive  
Note: `result` contains `weight` directly, while `data` does not exist
- **2024-09-24:** Restructure README so that the ACKS description reads better on the Forge site.
- **2024-09-09:** Update Monster Save UI
- **2024-09-09:** Update Monster Saving Throws in config.js  
Update Monster Saving Throws in config.js
- **2024-09-08:** Add adventuring and specific movement names

## Releases 12.0.0 to 12.1.0 - Initiative & Surprise Release

First major drop of ACKS II updates and corrections

### Updates

- Full initiative and surprise management: Update combat to use ACKS II Initiative sequence (first draft of it)
- Added ability to group combatants for initiative
- Added concept of outnumbering for combat
- Specific ACKS statuses displays: Combatant states like Readied, Done etc
- Colors for groups in the tracker (as an option)
- Helper document included
- Various fixes and improvements to support Foundry v11 and v12

### Bugfixes

- Fix rollHP
- Fix morale/loyalty rolls
- Fix for monsters items
- Properly recording of character scores during creation
- Fix equipped armors

### Change List

- **2024-08-26:** Update README.md to add compatibility instructions and clean up installation URLs.
- **2024-08-26:** Merge pull request #45 from AutarchLLC/initiative  
Force to add journal repository
- **2024-08-26:** Force to add journal repository
- **2024-08-26:** Merge pull request #44 from AutarchLLC/initiative  
Merge Initiative feature branch to master
- **2024-08-26:** Merge branch 'master' into initiative
- **2024-08-26:** Update Changelog
- **2024-08-22:** Merge pull request #43 from wyatt-kinkade/loyalty-roll-fix  
Update entity.js
- **2024-08-19:** Update entity.js  
Updates Loyalty Roll to use correct modifiers
- **2024-08-03:** Add lib folder in packaging
- **2024-08-25:** Change outnumbering computation (cf #19), by taking into account defeated combatants. Enable again color for combatant in the tracker
- **2024-08-25:** Compendium v12 alignement
- **2024-08-22:** Fix #43 in initiative branch
- **2024-08-22:** Fix #41 to rollHP  in initiative branch
- **2024-08-22:** Fix #42 in initiative branch
- **2024-08-12:** Fix #39 : Check done/delayed/readied state when toggling
- **2024-08-12:** Fix #37 : KCheck and fix outnumbering management, including when group are in same size
- **2024-08-12:** Fix #34 : Rework/rename outnumbering displays
- **2024-08-12:** Fix #38 : Initiative bonus management and display
- **2024-08-12:** Fix #35 : Casting management cleanup
- **2024-08-12:** Fix #36 : Hide surprise rolls for hidden monsters
- **2024-08-11:** Add image to Journal Helpers
- **2024-08-04:** Rework color select
- **2024-08-04:** Fixes regarding monsters items, fix #32
- **2024-08-03:** Fix various issues with color settings
- **2024-08-03:** Add colorsettings
- **2024-08-03:** Update main.yml
- **2024-08-02:** Add initiative/surprise for monsters, #20
- **2024-08-01:** Add group management for combat tracker, #17
- **2024-07-10:** Record properly character scores during creation, fix #29
- **2024-07-07:** Fix equipped armors, fix #28
- **2024-07-07:** Display a warning when initiative buttons are clicked before starting the combat, fix #27
- **2024-06-23:** Fix incorrect image path from images/ to system/acks/assets/
- **2024-06-23:** Integrate colorsettings into the system itself

git log --pretty=changelog e2c6fbf696b0c425eecff8cf9fba97b6cb5a7790..e57de163484f7fdafdf73f1c8cf7bc7992678237
git log --pretty=changelog e57de163484f7fdafdf73f1c8cf7bc7992678237..135970ff2321485f9b78778db0f6c380c871029e

## Releases 11.0.0 to 11.0.1: Early Development & FoundryVTT Updates

First release to support "modern" FoundryVTT

### Updates
- Update acks module to Foundry v11

### Bugfixes
- Fix internal script errors that were evident in the developer console.

### Changes

git log --pretty=changelog b6ff1c611aaeb08c0e00ff844ff76c34b7a1f587..3aa18d2fd6e70f015b361bbd4ac138ab8a08129f

- **2024-03-26:** Release automation for v11, WIP, #1
- **2024-03-26:** New beta testing release for v11, #1
- **2024-03-23:** Cleanup compendiums data, part of v11 migration - See #1
- **2024-03-23:** Fix #5 (weapon type selector) and #6 (spell name click)
- **2024-03-18:** #1 - Fixing manual packaging URL and links
- **2024-03-18:** #1 - Fix duplicated compendiums in system.json
- **2024-03-18:** #1 - Mnaul settings for package delivery
- **2024-03-18:** #1 - Add packaging workflow in CI/CD

## Git Configuration Information

How to configure Git to produce useful change history records:  
git config --global --add pretty.changelog format:"- %as: %s  %n%n%-b"  
git log --pretty=changelog

# ACKS (Original) Module History.

**v0.9.2 Encumbrance fix**
**MINOR CHANGES:**
Made encumbrance bar more efficient. (Azarvel)

**BUG FIXES:**
Encumbrance was not calculating properly. (Azarvel and THA)

**v0.9.1 A few bugs**
**BUG FIXES:**
Fixed Shield overriding AC. (Azarvel)
Fixed tweaks not working for PC sheets. (Azarvel)

**v0.9.0 Compatibility Release**
**MAJOR CHANGES:**
Thanks to the single-handed efforts of Azarvel, FoundryACKS is now compatible with release 9.0 of Foundry.

**v0.7.5 Saving Throw changes, Investments, and compatibility**

**MINOR CHANGES:**
Thank you to Olle Skogren for contributing the Investment Vagary tables from AXIOMS 3. You can find them in the ACKS Compendium.
Clarified language for Saving Throw bonuses to more clearly indicate when the bonus was being given.
Certified compatibility with Foundry 0.7.9.

**BUG FIXES:**
Fixed template preloading url error.
Fixed character creation dialog box not closing properly.

**v0.7.4 Saving Throw bonus**
**MINOR CHANGES:**
Changed wording in settings menu to reflect that the Wisdom bonus applies to all saves is not a houserule, but an HFH option.
HFH Option for wisdom bonuses to apply to all saves was only removing the "magic" button, now it applies the mod as well.

**BUG FIXES:**
Fixed wisdom bonus and penalties being swapped when rolling saves.

**v0.7.3 Monster Ability Fix**
**BUG FIXES:**
Monster sheet was unable to add abilities.

**v0.7.2 Monster Save Fix**
**MINOR CHANGES:**
Changed the changelog to bold text.

**BUG FIXES:**
Monster sheet was unable to roll saves for monsters pre-dating 0.7.0 release.

**v0.7.1 Cosmetics**
**MINOR CHANGES:**
Fixed tab heights and cleaned up sheets for legibility.

**BUG FIXES:**
Die icon for rolling morale checks and number appearing was obscuring field values.
Fixed a treasure bug where values were based off floats and not rounding properly to the nearest CP.

**v0.7.0 Compatibility with new Foundry release**
**MAJOR CHANGES:**
FoundryACKS is now compatible with release 7.5 of Foundry.

**MINOR CHANGES:**
Added support for ability scores above 18. It is assumed that every point above 18 adds a further +1 modifier. All dialogs adjusted accordingly.
Added a saving throw modifier to the tweaks dialog. This allows for a bonus or penalty to be applied to all saving throws (ex. Divine Blessing or Ring/Cloak of Protection). Suggested by Bobloblah.
Added support for applying half (resistant) or double (vulnerable) damage from chat cards. Suggested by Bobloblah.

**BUG FIXES:**
Added support for HP to dip into the negatives when auto-applied from chat cards. It was previously clamped to zero.

**IMPORTANT NOTE:**
*If you are upgrading characters from an older world, you may have blank "Saving Throw Bonus" fields in your tweaks. Put a value here (0 is fine) or you will be unable to roll saves.*

**v0.6.2 Further Compendium updates**
**MINOR CHANGES:**
Added Class Abilities, Monster Abilities, Monsters, Treasure Tables, and tokens and icons for all.
Swapped map with .webp format to save about 2MB from download package.

**v0.6.1 Removed Vancian spellcasting**
**MINOR CHANGES:**
When a spell is cast, it is incrememented (to remind the player what they cast already), and the total count of spells of that level cast also increment.
When spells are reset, they now roll back to 0. 
If converting a sheet from an earlier version, a one-time reset may be required to purge old values.

**v0.6.0 Now with more Compendium**
**MAJOR CHANGES:**
Bobloblah's compendium was imported and folded in to the ACKS release. There is more to be done, but most of the core arcane, divine spells, basic equipment, and proficiencies are in place, with their associated art icons, weights, descriptions, stats and costs. 
Added a world map of Cybele if a judge would like to use the default ACKS setting.

**v0.5.3 Morale and Loyalty systems**
**MINOR CHANGES:**
On retainer sheets, Morale and Loyalty can now be rolled by clicking on their fields.
Morale should be a number (typically between -6 and +4) and Loyalty is a text field, in which the Judge can write things to remind him of any bonuses or penalties that need to be applied to the Morale or Loyalty check.
Morale rolls are made each time the henchman suffers a calamity. A calamity includes suffering an energy drain, a curse, a magical disease, or being nearly killed (Judge's discretion).
Loyalty rolls should make a morale roll for each henchman at the end of each adventure whenever the henchman has leveled up, to determine if the henchman strikes off on his own or remains with the adventurer.

**v0.5.2 Houserule: Wisdom bonus to all saves**
**MINOR CHANGES:**
Added the popular wisdom bonus houserule to settings menu. Selecting it removes the prompt during rolling a save and declutters the Save vs Magic field from the sheet.

**v0.5.1 HFH Options / Core Toggle**
**MINOR CHANGES:**
Added toggle for Exploding 20s and BHR
Implemented auto-miss on 1 and auto-hit on 20 for Core Rules (non-HFH)

**BUG FIXES:**
Monster Saves pre-fill not present when monster is new
Negative Con mod could make HD roll negative (now floored at 1)
Negative Str mod could make damage negative (now minimum 1)

**v0.5.0 Initial Release**
**MAJOR FEATURES:**
Defaulted to exploding 20s in combat from HFH optional rules
Added BHR to the character sheet from HFH optional rules
Changed Ascending Armor Class to ACKS AC
Uncapped the dexterity and charisma bonuses
Implemented ACKS encumbrance rules (uses coin weight instead of stone - 1000 coins to a stone)
Changed default exploration checks (hear noise, open door, etc) to ACKS style rolls instead of 1d6 checks
Added more tweaks to the tweak section, to allow for ACKS proficiencies modifying throws, AC, and more.
Changed "Slow weapon" to subtract 1 from initiative instead of making the character last in the order.
Added a HOLD TURN icon to the Combat Tracker to remind the judge that a player has held their action.
Modified the encumbrance bar to reflect ACKS standard movement penalties while encumbered, and to show that on the bar.

**MINOR CHANGES:**
Renamed saving throws to be in-line with ACKS standards and order
Changed literacy to match ACKS standards
Added Auran languages and removed alignment tongues
Changed LR to Morale for Henchmen (To-do: Add roll table for Morale Checks instead of OSE roll-under)
Changed monster reaction rolls to match ACKS language
Changed default monster saves to match ACKS numbers (actually makes monsters a bit less resistant overall)
Removed DAC field from armor items

**BUG FIXES:**
Fixed a rounding error present in the OSE code
Fixed some areas where AC was not shown correctly in OSE code
