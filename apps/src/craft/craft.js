/* global trackEvent Raven */
import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import Hammer from "hammerjs";

var studioApp = require('../StudioApp').singleton;
var commonMsg = require('@cdo/locale');
var craftMsg = require('./locale');
var codegen = require('../codegen');
var GameController = require('./game/GameController');
var dom = require('../dom');
var houseLevels = require('./houseLevels');
var levelbuilderOverrides = require('./levelbuilderOverrides');
var eventsLevelbuilderOverrides = require('./eventsLevelbuilderOverrides');
var MusicController = require('../MusicController');
var Provider = require('react-redux').Provider;
var AppView = require('../templates/AppView');
var CraftVisualizationColumn = require('./CraftVisualizationColumn');
import {entityActionBlocks, entityActionTargetDropdownBlocks} from './blocks';

var TestResults = studioApp.TestResults;

var MEDIA_URL = '/blockly/media/craft/';

var ArrowIds = {
  LEFT: 'leftButton',
  UP: 'upButton',
  RIGHT: 'rightButton',
  DOWN: 'downButton'
};

var FacingDirection = Object.freeze({
  Up: 0,
  Right: 1,
  Down: 2,
  Left: 3,
});

/**
 * Create a namespace for the application.
 */
var Craft = module.exports;

window.Craft = Craft;
window.Blockly = Blockly;

var characters = {
  Steve: {
    name: "Steve",
    staticAvatar: MEDIA_URL + "Sliced_Parts/Pop_Up_Character_Steve_Neutral.png",
    smallStaticAvatar: MEDIA_URL + "Sliced_Parts/Pop_Up_Character_Steve_Neutral.png",
    failureAvatar: MEDIA_URL + "Sliced_Parts/Pop_Up_Character_Steve_Fail.png",
    winAvatar: MEDIA_URL + "Sliced_Parts/Pop_Up_Character_Steve_Win.png",
  },
  Alex: {
    name: "Alex",
    staticAvatar: MEDIA_URL + "Sliced_Parts/Pop_Up_Character_Alex_Neutral.png",
    smallStaticAvatar: MEDIA_URL + "Sliced_Parts/Pop_Up_Character_Alex_Neutral.png",
    failureAvatar: MEDIA_URL + "Sliced_Parts/Pop_Up_Character_Alex_Fail.png",
    winAvatar: MEDIA_URL + "Sliced_Parts/Pop_Up_Character_Alex_Win.png",
  }
};

var eventsCharacters = {
  Steve: {
    name: "Steve",
    staticAvatar: MEDIA_URL + "Events/Pop_Up_Character_Steve_Neutral.png",
    smallStaticAvatar: MEDIA_URL + "Events/Pop_Up_Character_Steve_Neutral.png",
    failureAvatar: MEDIA_URL + "Events/Pop_Up_Character_Steve_Fail.png",
    winAvatar: MEDIA_URL + "Events/Pop_Up_Character_Steve_Win.png",
  },
  Alex: {
    name: "Alex",
    staticAvatar: MEDIA_URL + "Events/Pop_Up_Character_Alex_Neutral.png",
    smallStaticAvatar: MEDIA_URL + "Events/Pop_Up_Character_Alex_Neutral.png",
    failureAvatar: MEDIA_URL + "Events/Pop_Up_Character_Alex_Fail.png",
    winAvatar: MEDIA_URL + "Events/Pop_Up_Character_Alex_Win.png",
  },
  Chicken: {
    staticAvatar: MEDIA_URL + "Events/Pop_Up_Character_Chicken_Neutral.png",
    smallStaticAvatar: MEDIA_URL + "Events/Pop_Up_Character_Chicken_Neutral.png",
    failureAvatar: MEDIA_URL + "Events/Pop_Up_Character_Chicken_Fail.png",
    winAvatar: MEDIA_URL + "Events/Pop_Up_Character_Chicken_Win.png",
  }
};

var interfaceImages = {
  DEFAULT: [
    MEDIA_URL + "Sliced_Parts/MC_Loading_Spinner.gif",
    MEDIA_URL + "Sliced_Parts/Frame_Large_Plus_Logo.png",
    MEDIA_URL + "Sliced_Parts/Frame_Large_Plus_LogoNew.png",
    MEDIA_URL + "Sliced_Parts/Pop_Up_Slice.png",
    MEDIA_URL + "Sliced_Parts/X_Button.png",
    MEDIA_URL + "Sliced_Parts/Button_Grey_Slice.png",
    MEDIA_URL + "Sliced_Parts/Run_Button_Up_Slice.png",
    MEDIA_URL + "Sliced_Parts/MC_Run_Arrow_Icon.png",
    MEDIA_URL + "Sliced_Parts/Run_Button_Down_Slice.png",
    MEDIA_URL + "Sliced_Parts/Reset_Button_Up_Slice.png",
    MEDIA_URL + "Sliced_Parts/MC_Reset_Arrow_Icon.png",
    MEDIA_URL + "Sliced_Parts/Reset_Button_Down_Slice.png",
    MEDIA_URL + "Sliced_Parts/Callout_Tail.png",
  ],
  1: [
    MEDIA_URL + "Sliced_Parts/Steve_Character_Select.png",
    MEDIA_URL + "Sliced_Parts/Alex_Character_Select.png",
    characters.Steve.staticAvatar,
    characters.Steve.smallStaticAvatar,
    characters.Alex.staticAvatar,
    characters.Alex.smallStaticAvatar,
  ],
  2: [
    // TODO(bjordan): find different pre-load point for feedback images,
    // bucket by selected character
    characters.Alex.winAvatar,
    characters.Steve.winAvatar,
    characters.Alex.failureAvatar,
    characters.Steve.failureAvatar,
  ],
  6: [
    MEDIA_URL + "Sliced_Parts/House_Option_A_v3.png",
    MEDIA_URL + "Sliced_Parts/House_Option_B_v3.png",
    MEDIA_URL + "Sliced_Parts/House_Option_C_v3.png",
  ]
};

var MUSIC_METADATA = [
  {volume: 1, hasOgg: true, name: "vignette1", group: 'day'},
  {volume: 1, hasOgg: true, name: "vignette2-quiet", group: 'night'},
  {volume: 1, hasOgg: true, name: "vignette3", group: 'night'},
  {volume: 1, hasOgg: true, name: "vignette4-intro", group: 'day'},
  {volume: 1, hasOgg: true, name: "vignette5-shortpiano", group: 'day'},
  {volume: 1, hasOgg: true, name: "vignette7-funky-chirps-short", group: 'day'},
  {volume: 1, hasOgg: true, name: "vignette8-free-play", group: 'day'},
];

var CHARACTER_STEVE = 'Steve';
var CHARACTER_ALEX = 'Alex';
var DEFAULT_CHARACTER = CHARACTER_STEVE;

function trySetLocalStorageItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    /**
     * localstorage .setItem in iOS Safari Private Mode always causes an
     * exception, see http://stackoverflow.com/a/14555361
     */
    if (console && console.log) {
      console.log("Couldn't set local storage item for key " + key);
    }
  }
}

/**
 * Initialize Blockly and the Craft app. Called on page load.
 */
Craft.init = function (config) {

  if (config.level.puzzle_number === 1 && config.level.stage_total === 1) {
    // Not viewing level within a script, bump puzzle # to unused one so
    // asset loading system and levelbuilder overrides don't think this is
    // level 1 or any other special level.
    config.level.puzzle_number = 999;
  }

  if (config.level.isTestLevel) {
    config.level.customSlowMotion = 0.1;
  }

  config.level.disableFinalStageMessage = true;
  config.showInstructionsInTopPane = true;

  // Return the version of Internet Explorer (8+) or undefined if not IE.
  var getIEVersion = function () {
    return document.documentMode;
  };

  var ieVersionNumber = getIEVersion();
  if (ieVersionNumber) {
    $('body').addClass("ieVersion" + ieVersionNumber);
  }

  if (config.level.useScore) {
    $('body').addClass("minecraft-scoring");
  }

  if (config.level.isEventLevel) {
    $('body').addClass("minecraft-events");
  }

  var bodyElement = document.body;
  bodyElement.className = bodyElement.className + " minecraft";

  if (config.level.showPopupOnLoad) {
    config.level.afterVideoBeforeInstructionsFn = (showInstructions) => {
      var event = document.createEvent('Event');
      event.initEvent('instructionsShown', true, true);
      document.dispatchEvent(event);

      if (config.level.showPopupOnLoad === 'playerSelection') {
        Craft.showPlayerSelectionPopup(function (selectedPlayer) {
          trackEvent('Minecraft', 'ChoseCharacter', selectedPlayer);
          Craft.clearPlayerState();
          trySetLocalStorageItem('craftSelectedPlayer', selectedPlayer);
          Craft.updateUIForCharacter(selectedPlayer);
          Craft.initializeAppLevel(config.level);
          showInstructions();
        });
      } else if (config.level.showPopupOnLoad === 'houseLayoutSelection') {
        Craft.showHouseSelectionPopup(function (selectedHouse) {
          trackEvent('Minecraft', 'ChoseHouse', selectedHouse);
          if (!levelConfig.edit_blocks) {
            Object.assign(config.level, houseLevels[selectedHouse]);

            Blockly.mainBlockSpace.clear();
            studioApp.setStartBlocks_(config, true);
          }
          Craft.initializeAppLevel(config.level);
          showInstructions();
        });
      }
    };
  }

  if (config.level.isEventLevel) {
    config.level.appSpecificFailError = config.level.temporaryFeedbackMessage;
  }

  const overridesToUse = config.level.isEventLevel ? eventsLevelbuilderOverrides : levelbuilderOverrides;
  if (config.level.puzzle_number && overridesToUse[config.level.puzzle_number]) {
    Object.assign(config.level, overridesToUse[config.level.puzzle_number]);
  }
  Craft.initialConfig = config;

  // replace studioApp methods with our own
  studioApp.reset = this.reset.bind(this);
  studioApp.runButtonClick = this.runButtonClick.bind(this);

  Craft.level = config.level;
  Craft.skin = config.skin;

  var levelTracks = [];
  if (Craft.level.songs && MUSIC_METADATA) {
    levelTracks = MUSIC_METADATA.filter(function (trackMetadata) {
      return Craft.level.songs.indexOf(trackMetadata.name) !== -1;
    });
  }

  Craft.musicController = new MusicController(
      studioApp.cdoSounds,
      function (filename) {
        return config.skin.assetUrl(`music/${filename}`);
      },
      levelTracks,
      config.level.dayNightCycleTime ? 100 : (levelTracks.length > 1 ? 7500 : null)
  );

  // Play music when the instructions are shown
  var playOnce = function () {
    document.removeEventListener('instructionsHidden', playOnce);
    if (studioApp.cdoSounds) {
      studioApp.cdoSounds.whenAudioUnlocked(function () {
        var hasSongInLevel = Craft.level.songs && Craft.level.songs.length > 1;
        var songToPlayFirst = hasSongInLevel ? Craft.level.songs[0] : null;
        Craft.musicController.play(songToPlayFirst);
      });
    }
  };
  document.addEventListener('instructionsHidden', playOnce);

  let character = characters[Craft.getCurrentCharacter()];
  if (config.level.isEventLevel) {
    character = config.level.usePlayer ? eventsCharacters[Craft.getCurrentCharacter()] : eventsCharacters['Chicken'];
  }
  config.skin.staticAvatar = character.staticAvatar;
  config.skin.smallStaticAvatar = character.smallStaticAvatar;
  config.skin.failureAvatar = character.failureAvatar;
  config.skin.winAvatar = character.winAvatar;

  var levelConfig = config.level;
  var specialLevelType = levelConfig.specialLevelType;
  switch (specialLevelType) {
    case 'houseWallBuild':
      levelConfig.blocksToStore = [
        "", "", "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "", "", "",
        "", "", "", "houseBottomA", "houseBottomB", "houseBottomC", "houseBottomD", "", "", "",
        "", "", "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "", "", ""
      ];
      break;
  }

  var onMount = function () {
    studioApp.init(Object.assign({}, config, {
      forceInsertTopBlock: config.level.isEventLevel ? null : 'when_run',
      appStrings: {
        generatedCodeDescription: craftMsg.generatedCodeDescription(),
      },
      enableShowCode: !config.level.isEventLevel,
      enableShowBlockCount: !config.level.isEventLevel,
      loadAudio: function () {},
      afterInject: function () {
        var slowMotionURLParam = parseFloat((location.search.split('customSlowMotion=')[1] || '').split('&')[0]);
        Craft.gameController = new GameController({
          Phaser: window.Phaser,
          containerId: 'phaser-game',
          assetRoot: Craft.skin.assetUrl(''),
          audioPlayer: {
            register: studioApp.registerAudio.bind(studioApp),
            play: studioApp.playAudio.bind(studioApp)
          },
          debug: false,
          customSlowMotion: slowMotionURLParam, // NaN if not set
          /**
           * First asset packs to load while video playing, etc.
           * Won't matter for levels without delayed level initialization
           * (due to e.g. character / house select popups).
           */
          earlyLoadAssetPacks: config.level.isEventLevel ? null :
              Craft.earlyLoadAssetsForLevel(levelConfig.puzzle_number),
          afterAssetsLoaded: function () {
            // preload music after essential game asset downloads completely finished
            Craft.musicController.preload();
          },
          earlyLoadNiceToHaveAssetPacks: config.level.isEventLevel ? null:
              Craft.niceToHaveAssetsForLevel(levelConfig.puzzle_number),
        });

        if (!config.level.showPopupOnLoad) {
          Craft.initializeAppLevel(config.level);
        }

        if (studioApp.hideSource) {
          // Set visualizationColumn width in share mode so it can be centered
          var visualizationColumn = document.getElementById('visualizationColumn');
          visualizationColumn.style.width = this.nativeVizWidth + 'px';
        }

        for (var btn in ArrowIds) {
          dom.addMouseUpTouchEvent(document.getElementById(ArrowIds[btn]),
              function (btn) {
                return () => {
                  Craft.onArrowButtonUp(ArrowIds[btn]);
                };
              }(btn));
          dom.addMouseDownTouchEvent(document.getElementById(ArrowIds[btn]),
              function (btn) {
                return (e) => {
                  Craft.onArrowButtonDown(e, ArrowIds[btn]);
                };
              }(btn));
        }

        dom.addMouseUpTouchEvent(document, Craft.onDocumentMouseUp);
        $('#soft-buttons').removeClass('soft-buttons-none').addClass('soft-buttons-' + 4);
        $('#soft-buttons').hide();

        const phaserGame = document.getElementById('phaser-game');
        const onDrag = function (e) {
          const hammerToButton = {
            [Hammer.DIRECTION_LEFT]: 'leftButton',
            [Hammer.DIRECTION_RIGHT]: 'rightButton',
            [Hammer.DIRECTION_UP]: 'upButton',
            [Hammer.DIRECTION_DOWN]: 'downButton',
          };
          if (hammerToButton[e.direction]) {
            Craft.gameController.codeOrgAPI.arrowDown(directionToFacing[hammerToButton[e.direction]]);
          }
          e.preventDefault();
        };

        var mc = new Hammer.Manager(phaserGame);
        mc.add(new Hammer.Pan({direction: Hammer.DIRECTION_ALL}));
        mc.add(new Hammer.Press({time: 150}) );
        mc.add(new Hammer.Tap() );
        mc.on("pan", onDrag);
        mc.on("press", () => Craft.gameController.codeOrgAPI.clickDown(() => {}));
        mc.on("tap", () => {
          Craft.gameController.codeOrgAPI.clickDown(() => {});
          Craft.gameController.codeOrgAPI.clickUp(() => {});
        });
        mc.on("pressup", () => Craft.gameController.codeOrgAPI.clickUp(() => {}));
      },
      twitter: {
        text: "Share on Twitter",
        hashtag: "Craft"
      }
    }));

    var interfaceImagesToLoad = [];
    interfaceImagesToLoad = interfaceImagesToLoad.concat(interfaceImages.DEFAULT);

    if (config.level.puzzle_number && interfaceImages[config.level.puzzle_number]) {
      if (!config.level.isEventLevel) {
        interfaceImagesToLoad =
            interfaceImagesToLoad.concat(interfaceImages[config.level.puzzle_number]);
      }
    }

    interfaceImagesToLoad.forEach(function (url) {
      preloadImage(url);
    });

    var shareButton = $('.mc-share-button');
    if (shareButton.length) {
      dom.addClickTouchEvent(shareButton[0], function () {
        Craft.reportResult(true);
      });
    }
  };

  // Push initial level properties into the Redux store
  studioApp.setPageConstants(config, {
    isMinecraft: true
  });

  ReactDOM.render(
    <Provider store={studioApp.reduxStore}>
      <AppView
        visualizationColumn={<CraftVisualizationColumn/>}
        onMount={onMount}
      />
    </Provider>,
    document.getElementById(config.containerId)
  );
};

var directionToFacing = {
  'upButton': FacingDirection.Up,
  'downButton': FacingDirection.Down,
  'leftButton': FacingDirection.Left,
  'rightButton': FacingDirection.Right,
};

Craft.onArrowButtonDown = function (e, btn) {
  Craft.gameController.codeOrgAPI.arrowDown(directionToFacing[btn]);
  e.preventDefault(); // Stop normal events so we see mouseup later.
};

Craft.onArrowButtonUp = function (btn) {
  Craft.gameController.codeOrgAPI.arrowUp(directionToFacing[btn]);
};

Craft.onDocumentMouseUp = function () {
  if (!Craft.phaserLoaded() || !Craft.levelInitialized()) {
    return;
  }

  for (var direction in directionToFacing) {
    Craft.gameController.codeOrgAPI.arrowUp(directionToFacing[direction]);
  }
};

var preloadImage = function (url) {
  var img = new Image();
  img.src = url;
};

Craft.characterAssetPackName = function (playerName) {
  return 'player' + playerName;
};

Craft.getCurrentCharacter = function () {
  return window.localStorage.getItem('craftSelectedPlayer') || DEFAULT_CHARACTER;
};

Craft.updateUIForCharacter = function (character) {
  let characters = Craft.initialConfig.level.isEventLevel ? eventsCharacters : characters;
  Craft.initialConfig.skin.staticAvatar = characters[character].staticAvatar;
  Craft.initialConfig.skin.smallStaticAvatar = characters[character].smallStaticAvatar;
  Craft.initialConfig.skin.failureAvatar = characters[character].failureAvatar;
  Craft.initialConfig.skin.winAvatar = characters[character].winAvatar;
  studioApp.setIconsFromSkin(Craft.initialConfig.skin);
  $('#prompt-icon').attr('src', characters[character].smallStaticAvatar);
};

Craft.showPlayerSelectionPopup = function (onSelectedCallback) {
  var selectedPlayer = DEFAULT_CHARACTER;
  var popupDiv = document.createElement('div');
  popupDiv.innerHTML = require('./dialogs/playerSelection.html.ejs')({
    image: studioApp.assetUrl()
  });
  var popupDialog = studioApp.createModalDialog({
    contentDiv: popupDiv,
    defaultBtnSelector: '#choose-steve',
    onHidden: function () {
      onSelectedCallback(selectedPlayer);
    },
    id: 'craft-popup-player-selection',
  });
  dom.addClickTouchEvent($('#close-character-select')[0], function () {
    popupDialog.hide();
  }.bind(this));
  dom.addClickTouchEvent($('#choose-steve')[0], function () {
    selectedPlayer = CHARACTER_STEVE;
    trackEvent('Minecraft', 'ClickedCharacter', selectedPlayer);
    popupDialog.hide();
  }.bind(this));
  dom.addClickTouchEvent($('#choose-alex')[0], function () {
    selectedPlayer = CHARACTER_ALEX;
    trackEvent('Minecraft', 'ClickedCharacter', selectedPlayer);
    popupDialog.hide();
  }.bind(this));
  popupDialog.show();
};

Craft.showHouseSelectionPopup = function (onSelectedCallback) {
  var popupDiv = document.createElement('div');
  popupDiv.innerHTML = require('./dialogs/houseSelection.html.ejs')({
    image: studioApp.assetUrl()
  });
  var selectedHouse = 'houseA';

  var popupDialog = studioApp.createModalDialog({
    contentDiv: popupDiv,
    defaultBtnSelector: '#choose-house-a',
    onHidden: function () {
      onSelectedCallback(selectedHouse);
    },
    id: 'craft-popup-house-selection',
    icon: characters[Craft.getCurrentCharacter()].staticAvatar
  });

  dom.addClickTouchEvent($('#close-house-select')[0], function () {
    popupDialog.hide();
  }.bind(this));
  dom.addClickTouchEvent($('#choose-house-a')[0], function () {
    selectedHouse = "houseA";
    trackEvent('Minecraft', 'ClickedHouse', selectedHouse);
    popupDialog.hide();
  }.bind(this));
  dom.addClickTouchEvent($('#choose-house-b')[0], function () {
    selectedHouse = "houseB";
    trackEvent('Minecraft', 'ClickedHouse', selectedHouse);
    popupDialog.hide();
  }.bind(this));
  dom.addClickTouchEvent($('#choose-house-c')[0], function () {
    selectedHouse = "houseC";
    trackEvent('Minecraft', 'ClickedHouse', selectedHouse);
    popupDialog.hide();
  }.bind(this));

  popupDialog.show();
};

Craft.clearPlayerState = function () {
  window.localStorage.removeItem('craftHouseBlocks');
  window.localStorage.removeItem('craftPlayerInventory');
  window.localStorage.removeItem('craftSelectedPlayer');
  window.localStorage.removeItem('craftSelectedHouse');
};

Craft.onHouseSelected = function (houseType) {
  trySetLocalStorageItem('craftSelectedHouse', houseType);
};

Craft.initializeAppLevel = function (levelConfig) {
  var houseBlocks = JSON.parse(window.localStorage.getItem('craftHouseBlocks'));
  Craft.foldInCustomHouseBlocks(houseBlocks, levelConfig);
  Craft.foldInEntities(houseBlocks, levelConfig);

  var fluffPlane = [];
  // TODO(bjordan): remove configuration requirement in visualization
  for (var i = 0; i < (levelConfig.gridWidth || 10) * (levelConfig.gridHeight || 10); i++) {
    fluffPlane.push('');
  }

  var levelAssetPacks = {
    beforeLoad: Craft.minAssetsForLevelWithCharacter(levelConfig.puzzle_number),
    afterLoad: Craft.afterLoadAssetsForLevel(levelConfig.puzzle_number)
  };

  const doNotShowPlayer = levelConfig.usePlayer === false;

  Craft.gameController.loadLevel({
    onDayCallback: () => {
      Craft.musicController.setGroup('day');
      Craft.musicController.fadeOut();
    },
    onNightCallback: () => {
      Craft.musicController.setGroup('night');
      Craft.musicController.fadeOut();
    },
    levelVerificationTimeout: levelConfig.levelVerificationTimeout,
    isDaytime: levelConfig.isDaytime,
    groundPlane: levelConfig.groundPlane,
    usePlayer: !doNotShowPlayer,
    useScore: levelConfig.useScore,
    entities: levelConfig.entities,
    isEventLevel: levelConfig.isEventLevel,
    groundDecorationPlane: levelConfig.groundDecorationPlane,
    actionPlane: levelConfig.actionPlane,
    fluffPlane: fluffPlane,
    playerStartPosition: levelConfig.playerStartPosition,
    playerStartDirection: levelConfig.playerStartDirection,
    playerName: Craft.getCurrentCharacter(),
    assetPacks: levelAssetPacks,
    specialLevelType: levelConfig.specialLevelType,
    houseBottomRight: levelConfig.houseBottomRight,
    gridDimensions: levelConfig.gridWidth && levelConfig.gridHeight ?
        [levelConfig.gridWidth, levelConfig.gridHeight] :
        null,
    // eslint-disable-next-line no-eval
    verificationFunction: eval('[' + levelConfig.verificationFunction + ']')[0], // TODO(bjordan): add to utils
    // eslint-disable-next-line no-eval
    failureCheckFunction: eval('[' + levelConfig.failureCheckFunction + ']')[0], // TODO(bjordan): add to utils
    // eslint-disable-next-line no-eval
    timeoutResult: eval('[' + (levelConfig.timeoutVerificationFunction || `function() { return false; }`) + ']')[0],
  });
};

Craft.minAssetsForLevelWithCharacter = function (levelNumber) {
  return Craft.minAssetsForLevelNumber(levelNumber)
      .concat([Craft.characterAssetPackName(Craft.getCurrentCharacter())]);
};

Craft.minAssetsForLevelNumber = function (levelNumber) {
  if (Craft.initialConfig.level.isEventLevel) {
    return ['allAssetsMinusPlayer'];
  }

  switch (levelNumber) {
    case 1:
      return ['levelOneAssets'];
    case 2:
      return ['levelTwoAssets'];
    case 3:
      return ['levelThreeAssets'];
    default:
      return ['allAssetsMinusPlayer'];
  }
};

Craft.afterLoadAssetsForLevel = function (levelNumber) {
  if (Craft.initialConfig.level.isEventLevel) {
    return ['allAssetsMinusPlayer'];
  }

  // After level loads & player starts playing, kick off further asset downloads
  switch (levelNumber) {
    case 1:
      // can disable if performance issue on early level 1
      return Craft.minAssetsForLevelNumber(2);
    case 2:
      return Craft.minAssetsForLevelNumber(3);
    default:
      // May want to push this to occur on level with video
      return ['allAssetsMinusPlayer'];
  }
};

Craft.earlyLoadAssetsForLevel = function (levelNumber) {
  switch (levelNumber) {
    case 1:
      return Craft.minAssetsForLevelNumber(levelNumber);
    default:
      return Craft.minAssetsForLevelWithCharacter(levelNumber);
  }
};

Craft.niceToHaveAssetsForLevel = function (levelNumber) {
  switch (levelNumber) {
    case 1:
      return ['playerSteve', 'playerAlex'];
    default:
      return ['allAssetsMinusPlayer'];
  }
};

/** Folds array B on top of array A */
Craft.foldInArray = function (arrayA, arrayB) {
  for (var i = 0; i < arrayA.length; i++) {
    if (arrayB[i] !== '') {
      arrayA[i] = arrayB[i];
    }
  }
};

Craft.foldInCustomHouseBlocks = function (houseBlockMap, levelConfig) {
  var planesToCustomize = [levelConfig.groundPlane, levelConfig.actionPlane];
  planesToCustomize.forEach(function (plane) {
    for (var i = 0; i < plane.length; i++) {
      var item = plane[i];
      if (item.match(/house/)) {
        plane[i] = (houseBlockMap && houseBlockMap[item]) ?
            houseBlockMap[item] : "planksBirch";
      }
    }
  });
};

Craft.foldInEntities = function (houseBlockMap, levelConfig) {
  const [width, height] = levelConfig.gridWidth && levelConfig.gridHeight ?
      [levelConfig.gridWidth, levelConfig.gridHeight] : [10, 10];

  var planesToCustomize = [levelConfig.actionPlane];
  planesToCustomize.forEach(function (plane) {
    for (var i = 0; i < plane.length; i++) {
      var item = plane[i];

      if (item.match(/sheep|zombie|ironGolem|creeper|cow|chicken/)) {
        const suffixToDirection = {
          Up: FacingDirection.Up,
          Down: FacingDirection.Down,
          Left: FacingDirection.Left,
          Right: FacingDirection.Right,
        };

        levelConfig.entities = levelConfig.entities || [];
        const x = i % width;
        const y = Math.floor(i / height);

        const directionMatch = item.match(/(.*)(Right|Left|Up|Down)/);
        const directionToUse = directionMatch ?
            suffixToDirection[directionMatch[2]] : FacingDirection.Right;
        const entityToUse = directionMatch ? directionMatch[1] : item;
        levelConfig.entities.push([entityToUse, x, y, directionToUse]);
        plane[i] = '';
      }
    }
  });
};

/**
 * Reset the app to the start position and kill any pending animation tasks.
 * @param {boolean} first true if first reset
 */
Craft.reset = function (first) {
  if (first) {
    return;
  }
  if (Craft.level.usePlayer) {
    $('#soft-buttons').hide();
  }
  Craft.gameController.codeOrgAPI.resetAttempt();
};

Craft.phaserLoaded = function () {
  return Craft.gameController &&
      Craft.gameController.game &&
      Craft.gameController.game.load &&
      !Craft.gameController.game.load.isLoading;
};

Craft.levelInitialized = function () {
  return Craft.gameController &&
      Craft.gameController.levelModel;
};

/**
 * Click the run button.  Start the program.
 */
Craft.runButtonClick = function () {
  if (!Craft.phaserLoaded()) {
    return;
  }

  if (Craft.level.usePlayer) {
    $('#soft-buttons').show();
  }

  var runButton = document.getElementById('runButton');
  var resetButton = document.getElementById('resetButton');

  // Ensure that Reset button is at least as wide as Run button.
  if (!resetButton.style.minWidth) {
    resetButton.style.minWidth = runButton.offsetWidth + 'px';
  }

  studioApp.toggleRunReset('reset');
  Blockly.mainBlockSpace.traceOn(true);
  studioApp.attempts++;

  Craft.executeUserCode();

  if (Craft.level.freePlay && !studioApp.hideSource) {
    var finishBtnContainer = $('#right-button-cell');

    if (finishBtnContainer.length &&
        !finishBtnContainer.hasClass('right-button-cell-enabled')) {
      finishBtnContainer.addClass('right-button-cell-enabled');
      studioApp.onResize();

      var event = document.createEvent('Event');
      event.initEvent('finishButtonShown', true, true);
      document.dispatchEvent(event);
    }
  }
};

Craft.executeUserCode = function () {
  if (Craft.initialConfig.level.edit_blocks) {
    this.reportResult(true);
    return;
  }

  if (studioApp.hasUnwantedExtraTopBlocks()) {
    // immediately check answer instead of executing, which will fail and
    // report top level blocks (rather than executing them)
    this.reportResult(false);
    return;
  }

  studioApp.playAudio('start');

  // Start tracing calls.
  Blockly.mainBlockSpace.traceOn(true);

  var appCodeOrgAPI = Craft.gameController.codeOrgAPI;
  appCodeOrgAPI.startCommandCollection();
  // Run user generated code, calling appCodeOrgAPI
  var code = '';
  let codeBlocks = Blockly.mainBlockSpace.getTopBlocks(true);
  if (studioApp.initializationBlocks) {
    codeBlocks = studioApp.initializationBlocks.concat(codeBlocks);
  }

  // For each top-level event block,
  //code += // Get [userCallback] the user's code and [eventType], [blockType] the type this is scoped for
  // e.g. eventType = whenTouched, blockType = logOak, userCallback = (blockReference) => { moveItForward(blockReference); moveItForward(blockReference); }
  var codeCollideObstacle = Blockly.Generator.blockSpaceToCode(
      'JavaScript',
      'craft_onTouched');
  //console.log(codeCollideObstacle);
  //var whenCollideObstacleFunc = codegen.functionFromCode(
  //    codeCollideObstacle, {
  //      StudioApp: studioApp,
  //      Flappy: api } );
  /**
   *
   * onTouched('stone', function(block)
   *   destroyEntity(blockReference);
   * });
   *   appCodeOrgAPI.registerEventCallback((e) => {
   *    if (e.type !== typeForThisEventCode) {
   *      return;
   *    }
   *
   *    if (e.blockType !== '[dropdown value, e.g. logOak') {
   *      return;
   *    }
   *
   *    evalWith(usersCode, {
   *      blockReference: e.block,
   *      moveItForward: function (codeHighlightID, blockReference) {
   *        appCodeOrgAPI.moveItForward(studioApp.highlight.bind(studioApp, blockID), blockReference);
    *     }
   *    });
   *  }
   */
  code = Blockly.Generator.blocksToCode('JavaScript', codeBlocks);
  if (typeof Raven !== 'undefined') {
    Raven.setExtraContext({ code: code, blocks: Blockly.Xml.domToPrettyText(Blockly.Xml.blockSpaceToDom(Blockly.mainBlockSpace)) });
  }
  const evalApiMethods = {
    moveForward: function (blockID) {
      appCodeOrgAPI.moveForward(studioApp.highlight.bind(studioApp, blockID));
    },
    onTouched: function (type, callback, blockID) {
      appCodeOrgAPI.registerEventCallback(studioApp.highlight.bind(studioApp, blockID),
          function (event) {
            if (event.eventType !== 'blockTouched') {
              return;
            }
            if (event.blockType !== type) {
              return;
            }

            callback(event.blockReference);
          });
    },
    onPlayerMoved: function (type, callback, blockID) {
      appCodeOrgAPI.registerEventCallback(studioApp.highlight.bind(studioApp, blockID),
          function (event) {
            if (event.eventType !== 'playerMoved') {
              return;
            }
            if (event.blockType !== type) {
              return;
            }

            callback(event.blockReference);
          });
    },
    onEventTriggered: function (type, eventType, callback, blockID) {
      appCodeOrgAPI.registerEventCallback(studioApp.highlight.bind(studioApp, blockID),
          function (event) {
            if (event.eventType !== eventType) {
              return;
            }
            if (event.targetType !== type) {
              return;
            }
            callback(event);
          });
    },
    onGlobalEventTriggered: function (eventType, callback, blockID) {
      appCodeOrgAPI.registerEventCallback(studioApp.highlight.bind(studioApp, blockID),
          function (event) {
            if (event.eventType !== eventType) {
              return;
            }
            callback(event);
          });
    },
    drop: function (blockType, targetEntity, blockID) {
      appCodeOrgAPI.drop(studioApp.highlight.bind(studioApp, blockID), blockType, targetEntity);
    },
    turnLeft: function (blockID) {
      appCodeOrgAPI.turn(studioApp.highlight.bind(studioApp, blockID), "left");
    },
    turnRight: function (blockID) {
      appCodeOrgAPI.turn(studioApp.highlight.bind(studioApp, blockID), "right");
    },
    destroyBlock: function (blockID) {
      appCodeOrgAPI.destroyBlock(studioApp.highlight.bind(studioApp, blockID));
    },
    shear: function (blockID) {
      appCodeOrgAPI.destroyBlock(studioApp.highlight.bind(studioApp, blockID));
    },
    tillSoil: function (blockID) {
      appCodeOrgAPI.tillSoil(studioApp.highlight.bind(studioApp, blockID));
    },
    whilePathAhead: function (blockID, callback) {
      // if resurrected, move blockID be last parameter to fix "Show Code"
      appCodeOrgAPI.whilePathAhead(studioApp.highlight.bind(studioApp, blockID),
          '',
          callback);
    },
    whileBlockAhead: function (blockID, blockType, callback) {
      // if resurrected, move blockID be last parameter to fix "Show Code"
      appCodeOrgAPI.whilePathAhead(studioApp.highlight.bind(studioApp, blockID),
          blockType,
          callback);
    },
    repeat: function (blockID, callback, iterations, targetEntity) {
      // if resurrected, move blockID be last parameter to fix "Show Code"
      appCodeOrgAPI.repeat(studioApp.highlight.bind(studioApp, blockID),
          callback, iterations, targetEntity);
    },
    repeatRandom: function (blockID, callback, targetEntity) {
      // if resurrected, move blockID be last parameter to fix "Show Code"
      appCodeOrgAPI.repeatRandom(studioApp.highlight.bind(studioApp, blockID),
          callback, targetEntity);
    },
    ifLavaAhead: function (callback, blockID) {
      // if resurrected, move blockID be last parameter to fix "Show Code"
      appCodeOrgAPI.ifBlockAhead(studioApp.highlight.bind(studioApp, blockID),
          "lava",
          callback);
    },
    ifBlockAhead: function (blockType, callback, blockID) {
      appCodeOrgAPI.ifBlockAhead(studioApp.highlight.bind(studioApp, blockID),
          blockType,
          callback);
    },
    placeBlock: function (blockType, blockID) {
      appCodeOrgAPI.placeBlock(studioApp.highlight.bind(studioApp, blockID),
          blockType);
    },
    playSound: function (soundID, targetEntity, blockID) {
      appCodeOrgAPI.playSound(studioApp.highlight.bind(studioApp, blockID),
          soundID, targetEntity);
    },
    addScore: function (scoreAmount, blockID) {
      appCodeOrgAPI.addScore(studioApp.highlight.bind(studioApp, blockID),
          parseInt(scoreAmount));
    },
    plantCrop: function (blockID) {
      appCodeOrgAPI.placeBlock(studioApp.highlight.bind(studioApp, blockID),
          "cropWheat");
    },
    placeTorch: function (blockID) {
      appCodeOrgAPI.placeBlock(studioApp.highlight.bind(studioApp, blockID),
          "torch");
    },
    placeBlockAhead: function (blockType, blockID) {
      appCodeOrgAPI.placeInFront(studioApp.highlight.bind(studioApp, blockID),
          blockType);
    },
    moveDirection: function (direction, targetEntity, blockID) {
      const dirStringToDirection = {
        up: FacingDirection.Up,
        down: FacingDirection.Down,
        left: FacingDirection.Left,
        right: FacingDirection.Right,
      };
      appCodeOrgAPI.moveDirection(studioApp.highlight.bind(studioApp, blockID),
          dirStringToDirection[direction], targetEntity);
    },
    spawnEntity: function (type, direction, blockID) {
      appCodeOrgAPI.spawnEntity(studioApp.highlight.bind(studioApp, blockID),
          type, direction);
    },
    wait: function (time, targetEntity, blockID) {
      const randomMin = .1;
      const randomMax = 3;
      appCodeOrgAPI.wait(studioApp.highlight.bind(studioApp, blockID),
          time === 'random' ? _.random(randomMin, randomMax, true) : time,
          targetEntity);
    },
    spawnEntityRandom: function (type, blockID) {
      var locationOptions = [
        'up',
        'middle',
        'right',
        'down',
        'left',
      ];
      const direction = _.sample(locationOptions);

      appCodeOrgAPI.spawnEntity(studioApp.highlight.bind(studioApp, blockID),
          type, direction);
    }
  };

  entityActionBlocks.concat(['turnLeft', 'turnRight', 'turnRandom']).forEach((methodName) => {
    evalApiMethods[methodName] = function (targetEntity, blockID) {
      appCodeOrgAPI[methodName](studioApp.highlight.bind(studioApp, blockID), targetEntity);
    };
  });

  entityActionTargetDropdownBlocks.forEach((methodName) => {
    evalApiMethods[methodName] = function (targetEntity, moveTo, blockID) {
      appCodeOrgAPI[methodName](studioApp.highlight.bind(studioApp, blockID), targetEntity, moveTo);
    };
  });

  codegen.evalWith(code, evalApiMethods, true);
  appCodeOrgAPI.startAttempt(function (success, levelModel) {
    if (Craft.level.freePlay) {
      return;
    }
    this.reportResult(success);

    var tileIDsToStore = Craft.initialConfig.level.blocksToStore;
    if (success && tileIDsToStore) {
      var newHouseBlocks = JSON.parse(window.localStorage.getItem('craftHouseBlocks')) || {};
      for (var i = 0; i < levelModel.actionPlane.length; i++) {
        if (tileIDsToStore[i] !== '') {
          newHouseBlocks[tileIDsToStore[i]] = levelModel.actionPlane[i].blockType;
        }
      }
      trySetLocalStorageItem('craftHouseBlocks', JSON.stringify(newHouseBlocks));
    }

    var attemptInventoryTypes = levelModel.getInventoryTypes();
    var playerInventoryTypes = JSON.parse(window.localStorage.getItem('craftPlayerInventory')) || [];

    var newInventorySet = {};
    attemptInventoryTypes.concat(playerInventoryTypes).forEach(function (type) {
      newInventorySet[type] = true;
    });

    trySetLocalStorageItem('craftPlayerInventory', JSON.stringify(Object.keys(newInventorySet)));
  }.bind(this));

  if (Craft.initialConfig.level.dayNightCycleTime) {
    appCodeOrgAPI.setDayNightCycle(Craft.initialConfig.level.dayNightCycleStart,
        Craft.initialConfig.level.dayNightCycleTime || 0,
        Craft.initialConfig.level.isDaytime ? 'night' : 'day');
  }
};

Craft.getTestResultFrom = function (success, studioTestResults) {
  if (studioTestResults === TestResults.LEVEL_INCOMPLETE_FAIL) {
    return TestResults.APP_SPECIFIC_FAIL;
  }

  if (Craft.initialConfig.level.freePlay) {
    return TestResults.FREE_PLAY;
  }

  return studioTestResults;
};

Craft.reportResult = function (success) {
  var studioTestResults = studioApp.getTestResults(success);
  var testResultType = Craft.getTestResultFrom(success, studioTestResults);

  var keepPlayingText = Craft.replayTextForResult(testResultType);

  const image = Craft.initialConfig.level.freePlay ?
      Craft.gameController.getScreenshot() : null;
  // Grab the encoded image, stripping out the metadata, e.g. `data:image/png;base64,`
  const encodedImage = image ? encodeURIComponent(image.split(',')[1]) : null;

  studioApp.report({
    app: 'craft',
    level: Craft.initialConfig.level.id,
    result: Craft.initialConfig.level.freePlay ? true : success,
    testResult: testResultType,
    image: encodedImage,
    program: encodeURIComponent(
        Blockly.Xml.domToText(
            Blockly.Xml.blockSpaceToDom(
                Blockly.mainBlockSpace))),
    // typically delay feedback until response back
    // for things like e.g. crowdsourced hints & hint blocks
    onComplete: function (response) {
      studioApp.displayFeedback({
        keepPlayingText: keepPlayingText,
        app: 'craft',
        skin: Craft.initialConfig.skin.id,
        feedbackType: testResultType,
        response: response,
        level: Craft.initialConfig.level,
        defaultToContinue: Craft.shouldDefaultToContinue(testResultType),
        appStrings: {
          reinfFeedbackMsg: craftMsg.reinfFeedbackMsg(),
          nextLevelMsg: craftMsg.nextLevelMsg({
            puzzleNumber: Craft.initialConfig.level.puzzle_number
          }),
          tooManyBlocksFailMsgFunction: craftMsg.tooManyBlocksFail,
          generatedCodeDescription: craftMsg.generatedCodeDescription()
        },
        feedbackImage: image,
        showingSharing: Craft.initialConfig.level.freePlay
      });
    }
  });
};

/**
 * Whether pressing "x" or pressing the backdrop of the "level completed" dialog
 * should default to auto-advancing to the next level.
 * @param {string} testResultType TestResults type of this level completion
 * @returns {boolean} whether to continue
 */
Craft.shouldDefaultToContinue = function (testResultType) {
  var isFreePlay = testResultType === TestResults.FREE_PLAY;
  var isSuccess = testResultType > TestResults.APP_SPECIFIC_ACCEPTABLE_FAIL;
  return isSuccess && !isFreePlay;
};

Craft.replayTextForResult = function (testResultType) {
  if (testResultType === TestResults.FREE_PLAY) {
    return craftMsg.keepPlayingButton();
  } else if (testResultType <= TestResults.APP_SPECIFIC_ACCEPTABLE_FAIL) {
    return commonMsg.tryAgain();
  } else {
    return craftMsg.replayButton();
  }
};
