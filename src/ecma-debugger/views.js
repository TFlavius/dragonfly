window.cls || (window.cls = {});

/**
  * @constructor
  * @extends ViewBase
  */

cls.EnvironmentView = function(id, name, container_class)
{
  var self = this;
  this.createView = function(container)
  {
    container.innerHTML = '';
    container.render(templates.hello(window.services['scope'].get_hello_message()));
  }
  this.init(id, name, container_class);
}

cls.EnvironmentView.create_ui_widgets = function()
{
  new Settings
  (
    // id
    'environment',
    // key-value map
    {
      'environment': true
    },
    // key-label map
    {
    },
    // settings map
    {
      customSettings:
      [
        'environment'
      ]
    },
    // template
    {
      environment:
      function(setting)
      {
        return templates.hello(window.services['scope'].get_hello_message());
      }
    },
    "about"

  );
};

cls.AboutView = function(id, name, container_class)
{
  this.init(id, name, container_class);
}

cls.AboutView.create_ui_widgets = function()
{
  new Settings
  (
    // id
    'about',
    // key-value map
    {
      'about': true
    },
    // key-label map
    {
    },
    // settings map
    {
      customSettings:
      [
        'about'
      ]
    },
    // template
    {
      about:
      function(setting)
      {
        var on_about_sucess = function(xml)
        {
          var authors = document.getElementById('about-authors');
          var response_text = xml.responseText;
          if (authors && response_text)
            authors.textContent = response_text;
        };

        var on_about_error = function()
        {
          var authors = document.getElementById('about-authors');
          if (authors)
          {
            var tmpl = ["a", ui_strings.S_CONTRIBUTORS,
                             "target", "_blank",
                             "style", "color: inherit",
                             "href", "https://github.com/operasoftware/dragonfly/blob/master/AUTHORS"];
            authors.render(tmpl);
          }
        };

        new XMLHttpRequest().loadResource("AUTHORS", on_about_sucess, null, on_about_error);
        return ["ul", ["li", "id", "about-authors", "class", "padding selectable"]];
      }
    },
    "about"
  );
}

/**
  * @constructor
  * @extends ViewBase
  * Settings are bound to a view. This class it only to have 'General Settings'.
  */

cls.GeneralView = function(id, name, container_class)
{
  this.is_hidden = true;
  this.createView = function(container)
  {
  }
  this.init(id, name, container_class);
}

cls.GeneralView.create_ui_widgets = function()
{
  // Scope transport status codes, as named in cls.ServiceBase's status map.
  const SCOPE_OK = 0;
  const SCOPE_SERVICE_ALREADY_ENABLED = 9;

  /**
   * The name of a Scope transport status, for a message a person will read.
   * @param {Number} status The status the host answered with.
   * @return {String} its name, or the number when it has none.
   */
  var scope_status_name = function(status)
  {
    return cls.ServiceBase.get_status_map()[status] || String(status);
  };

  /**
   * Use a desktop-utils command, enabling the service first.
   *
   * desktop-utils is in no profile, so nothing else turns it on. A command
   * sent to a service that is not enabled is answered with ServiceNotEnabled
   * instead of being run, and enabling one that is already enabled is
   * answered with ServiceAlreadyEnabled; both outcomes mean it is on. The
   * reply is taken by tag, so the profile bookkeeping in cls.Scope never sees
   * an enable it did not ask for.
   *
   * @param {String} method The request method the command needs. The
   *        interface is generated from the host's own protocol description,
   *        so it exists if and only if this browser declares that command.
   * @param {Function} on_ready Called with the service once it can be used.
   * @param {Function} on_unavailable Called with the status that refused the
   *        enable, or null when the host does not offer the command at all.
   *        May be called before this function returns.
   */
  var with_desktop_utils = function(method, on_ready, on_unavailable)
  {
    var service = window.services && window.services['desktop-utils'];
    if (!service || !service[method])
    {
      on_unavailable(null);
      return;
    }
    window.services.scope.requestEnable(
      window.tagManager.set_callback(null, function(status, message)
      {
        if (status != SCOPE_OK && status != SCOPE_SERVICE_ALREADY_ENABLED)
          on_unavailable(status);
        else
          on_ready(service);
      }),
      ['desktop-utils']);
  };

  /* Where the client that is running came from.
   *
   * The document's own URL is the one the browser resolved and followed, and
   * neither it nor the profile folder can move while the document is loaded,
   * so this is worked out once and kept for the session.
   *
   * It describes this window's own browser. Under remote debugging the host
   * answering is not necessarily that browser, and then the profile folder
   * belongs to the debugged one; the client cannot currently reach that state
   * because the proxy it needs does not run any more.
   */
  var client_origin = {state: 'unasked', profile: ''};

  /**
   * The path of the document this client is running as.
   *
   * ConvertFullPathtoURL builds the URL the browser follows: it escapes the
   * path, substitutes the platform separator for '/', and prefixes
   * "file://localhost". The authority is optional in what comes back here, so
   * both spellings are read. A query or a fragment is not part of the path
   * and is dropped; the client is started with one whenever its own debug
   * environment is asked for.
   *
   * @return {String} the decoded native path, or null when the client did not
   *         come from a file: URL, which neither branch of ResolveDevToolsUrl
   *         can produce and only the preference can.
   */
  var client_file_path = function()
  {
    var match = /^file:\/\/(?:localhost)?(\/[^?#]*)/i.exec(window.location.href);
    if (!match)
      return null;
    var path = match[1];
    // A malformed escape is not worth failing over: the undecoded path is
    // still a true location, and the comparison below simply will not match.
    try { path = decodeURIComponent(path); } catch (e) {}
    // A Windows path arrives as /C:/... . That first slash is the URL's.
    return /^\/[a-zA-Z]:[\/\\]/.test(path) ? path.slice(1) : path;
  };

  /**
   * Whether a file path lies inside a directory.
   *
   * The platform is read from the shape of the directory's root and from
   * nothing else: a drive letter, or the two backslashes of a UNC share. A
   * backslash anywhere further along says nothing at all, because on Unix it
   * is an ordinary character in a name. Treating one as a separator there
   * would rewrite ".opera\\other", which sits beside the profile, into
   * ".opera/other", which sits below it, and folding case on the strength of
   * one would let a name that differs from the profile only in case match it.
   * Both mistakes report a document as the profile copy when it is not, and
   * that is the branch that asserts rather than hedges.
   *
   * So separators and case are touched only where the file system itself
   * ignores them, and a Unix path is compared byte for byte. A shape that is
   * not recognised is compared as Unix, which can only cost a match this
   * would otherwise have made, never invent one.
   *
   * OpFolderManager appends the platform separator to every folder path it
   * stores, but that is its behaviour rather than a promise, so a missing one
   * is added here.
   *
   * @param {String} path A native file path.
   * @param {String} directory A native directory path.
   * @return {Boolean} true when path names something below directory.
   */
  var path_is_inside = function(path, directory)
  {
    var is_windows = /^[a-zA-Z]:[\/\\]/.test(directory) ||
                     /^\\\\/.test(directory);
    var dir = directory;
    var file = path;
    if (is_windows)
    {
      dir = dir.replace(/\\/g, '/').toLowerCase();
      file = file.replace(/\\/g, '/').toLowerCase();
    }
    if (dir.slice(-1) != '/')
      dir += '/';
    return file.indexOf(dir) == 0;
  };

  /**
   * What to say about where the running client came from.
   * @return {Array} one template per line, the location first.
   */
  var client_origin_lines = function()
  {
    var path = client_file_path();
    var lines =
    [
      ['p', ui_strings.S_LABEL_DEVTOOLS_CLIENT_LOCATION + ': ' +
            (path || window.location.href)]
    ];
    if (!path)
      lines.push(['p', ui_strings.S_INFO_DEVTOOLS_CLIENT_ORIGIN_CONFIGURED]);
    else if (client_origin.state == 'known')
      // The installer writes below the same folder this reports, so a client
      // below it is one an update put there and nothing else can be.
      lines.push(['p', path_is_inside(path, client_origin.profile)
                       ? ui_strings.S_INFO_DEVTOOLS_CLIENT_ORIGIN_PROFILE
                       : ui_strings.S_INFO_DEVTOOLS_CLIENT_ORIGIN_ELSEWHERE]);
    else if (client_origin.state == 'unavailable')
      lines.push(['p', ui_strings.S_INFO_DEVTOOLS_CLIENT_ORIGIN_UNKNOWN]);
    else
      lines.push(['p', ui_strings.S_INFO_DEVTOOLS_CLIENT_ORIGIN_CHECKING]);
    return lines;
  };

  /** Redraw the origin block, if it is on screen. */
  var refresh_client_origin = function()
  {
    var block = document.getElementById('devtools-client-origin');
    if (block)
      block.clearAndRender(client_origin_lines());
  };

  /**
   * Find out where the running client came from, once for the session.
   *
   * Does nothing when the answer is already in or cannot depend on the
   * profile folder. GetSmallPreferencesPath has been in desktop-utils since
   * 2.0, so this works on builds from before the update command as well.
   */
  var resolve_client_origin = function()
  {
    if (client_origin.state != 'unasked' || !client_file_path())
      return;
    client_origin.state = 'asking';

    const PATH = 0;
    var unavailable = function(status)
    {
      client_origin.state = 'unavailable';
      refresh_client_origin();
    };

    with_desktop_utils('requestGetSmallPreferencesPath',
      function(service)
      {
        service.requestGetSmallPreferencesPath(
          window.tagManager.set_callback(null, function(status, message)
          {
            if (status != SCOPE_OK || !message || !message[PATH])
            {
              unavailable(status);
              return;
            }
            client_origin.profile = message[PATH];
            client_origin.state = 'known';
            refresh_client_origin();
          }), []);
      },
      unavailable);
  };

  new Settings
  (
    // id
    'general',
    // key-value map
    {
      "show-views-menu": false,
      "window-attached": true,
      "show-only-normal-and-gadget-type-windows": true,
      "shortcuts": null,
      "shortcuts-hash": "",
    },
    // key-label map
    {
      "show-views-menu": ui_strings.S_SWITCH_SHOW_VIEWS_MENU,
      "show-only-normal-and-gadget-type-windows": ui_strings.S_SWITCH_SHOW_ONLY_NORMAL_AND_GADGETS_TYPE_WINDOWS,
    },
    // settings map
    {
      checkboxes:
      [
        "show-only-normal-and-gadget-type-windows",
      ],
      customSettings:
      [
        'hr',
        'ui-language',
        'hr',
        'update-devtools-client',
        'devtools-client-origin'
      ]
    },
    // custom templates
    {
      'hr':
      function(setting)
      {
        return ['hr'];
      },
      'update-devtools-client':
      function(setting)
      {
        // A button rather than a stored setting. The browser never looks for a
        // newer client on its own, so pressing this is the only thing that
        // starts an update, and there is no state worth keeping between
        // presses. The result is written beside the button by the handler.
        return (
        [
          'setting-composite',
          ui_strings.S_LABEL_UPDATE_DEVTOOLS_CLIENT + ': ',
          ['button',
            ui_strings.S_BUTTON_UPDATE_DEVTOOLS_CLIENT,
            'type', 'button',
            'handler', 'update-devtools-client',
            'class', 'ui-button'
          ]
        ] );
      },
      'devtools-client-origin':
      function(setting)
      {
        // Rendered before the answer is in and again from the reply, which
        // arrives long after this template has become DOM and been handed
        // away; the id is how the reply finds it again.
        resolve_client_origin();
        return (
        [
          'setting-composite',
          ['div',
            client_origin_lines(),
            'id', 'devtools-client-origin',
            'class', 'devtools-client-origin selectable'
          ]
        ] );
      },
      'ui-language':
      function(setting)
      {
        return [
          ['setting-composite',
            ui_strings.M_LABEL_UI_LANGUAGE + ': ',
            [
              'select',
              templates.uiLangOptions(),
              'handler', 'set-ui-language'
            ],
            [
              "span", ui_strings.S_BUTTON_LOAD_PO_FILE,
              "handler", "show-po-selector",
              "class", "ui-button",
              "tabindex", "1"
            ]
          ]
        ];
      }
    },
    "general"
  );

  eventHandlers.click["show-po-selector"] = function(event)
  {
    UIWindowBase.showWindow('test-po-file');
  }

  eventHandlers.change['set-ui-language'] = function(event)
  {
    helpers.setCookie('ui-lang', event.target.value);
    helpers.setCookie('ui-lang-set', '1');
    var parent = event.target.parentNode;
    var container = parent.getElementsByClassName('change-ui-lang-info')[0] ||
                    parent.render(['div', 'class', 'change-ui-lang-info selectable']);
    var ui_str = ui_strings.S_LABEL_CHANGE_UI_LANGUAGE_INFO.split("%s");
    var tmpl =
    [
      ['h2',
        ui_str[0] + ' ',
        ['a',
          'opera:config#DeveloperTools|DeveloperToolsURL',
          'href', 'opera:config#DeveloperTools|DeveloperToolsURL',
          'target', '_blank'
        ],
        ' ' + ui_str[1]
      ],
      ['ul',
        ["", "cutting-edge/", "experimental/"].map(function(part)
        {
          return (
          ['li',
            ['code', "https://dragonfly.opera.com/app/"  + part + "client-" +
                     event.target.value + ".xml"]
          ]);
        }),
      ]
    ];
    container.clearAndRender(tmpl);
  };

  eventHandlers.click['update-devtools-client'] = function(event, target)
  {
    // One press, one update. The button carries disabled from the moment a
    // request goes out until its reply comes back, and this is what makes
    // that mean something: the delegated click handler runs off a listener on
    // the document, so it must not depend on the element having suppressed
    // the event itself.
    if (target.getAttribute('disabled'))
      return;

    // Fields of DesktopUtils.DevToolsClientUpdate, by field number less one.
    const STATUS = 0;
    const TAG = 1;
    const MESSAGE = 2;
    // Values of its status enum. FAILED, the third, is the default branch.
    const UPDATED = 1;
    const ALREADY_CURRENT = 2;

    var composite = target.parentNode;
    var info = composite.getElementsByClassName('update-devtools-client-info')[0] ||
               composite.render(['div',
                                 'class', 'update-devtools-client-info selectable']);

    var say = function(template)
    {
      target.removeAttribute('disabled');
      info.clearAndRender(template);
    };

    // The release tag is optional on the wire even where the contract says it
    // is sent, so it is a line of its own that is left out when it is absent
    // rather than a hole in a sentence.
    var release_line = function(tag)
    {
      return tag
             ? [['p', ui_strings.S_LABEL_UPDATE_DEVTOOLS_CLIENT_RELEASE + ': ' + tag]]
             : [];
    };

    var unavailable = function(status)
    {
      // A null status is a host that does not declare the command at all,
      // which is not a refusal and does not read like one.
      say([['p', status === null
                 ? ui_strings.S_INFO_UPDATE_DEVTOOLS_CLIENT_UNSUPPORTED
                 : ui_strings.S_INFO_UPDATE_DEVTOOLS_CLIENT_REJECTED
                             .replace("%s", scope_status_name(status))]]);
    };

    var on_response = function(status, message)
    {
      if (status != SCOPE_OK)
      {
        unavailable(status);
        return;
      }
      switch (message[STATUS])
      {
        case UPDATED:
          say([['p', ui_strings.S_INFO_UPDATE_DEVTOOLS_CLIENT_UPDATED]]
              .concat(release_line(message[TAG])));
          break;
        case ALREADY_CURRENT:
          say([['p', ui_strings.S_INFO_UPDATE_DEVTOOLS_CLIENT_CURRENT]]
              .concat(release_line(message[TAG])));
          break;
        default:
          // FAILED carries the browser's own reason. Any other value is a
          // contract this client does not know, and the number is then the
          // only thing there is to show.
          say([['p', ui_strings.S_INFO_UPDATE_DEVTOOLS_CLIENT_FAILED
                               .replace("%s", message[MESSAGE] ||
                                              String(message[STATUS]))]]);
      }
    };

    target.setAttribute('disabled', 'disabled');
    info.clearAndRender([['p', ui_strings.S_INFO_UPDATE_DEVTOOLS_CLIENT_WORKING]]);
    with_desktop_utils('requestUpdateDevToolsClient',
      function(service)
      {
        service.requestUpdateDevToolsClient(
          window.tagManager.set_callback(null, on_response), []);
      },
      unavailable);
  };

}



/**
  * @constructor
  * @extends ViewBase
  * Settings are bound to a view. This class it only to have 'General Settings'.
  */

cls.HostSpotlightView = function(id, name, container_class)
{
  this.is_hidden = true;
  this.createView = function(container)
  {
  }
  this.init(id, name, container_class);
}

cls.HostSpotlightView.create_ui_widgets = function()
{
  new Settings
  (
    // id
    'host-spotlight',
    // key-value map
    {
      'spotlight-color': "3875d7",
    },
    // key-label map
    {

    },
    // settings map
    {
      checkboxes:
      [

      ],
      customSettings:
      [
        'colors'
      ]
    },
    // custom templates
    {
      'colors':
      function(setting)
      {
        return hostspotlighter.colorSelectsTemplate();
      }
    },
    "document"
  );
}



/**
  * @constructor
  * @extends ViewBase
  * Settings are bound to a view. This class it only to have 'General Settings'.
  */

cls.DocumentationView = function(id, name, container_class)
{
  var __url = '';
  this.setURL = function(url)
  {
    __url = url;
  }
  this.createView = function(container)
  {
    if( __url )
    {
      container.render(['iframe',
                        'width', '100%', 'height', '100%',
                        'style', 'dispaly:block;border:none',
                        'src', __url])
    }

  }
  this.init(id, name, container_class);
}

/**
  * @constructor
  * @extends ViewBase
  * Settings are bound to a view. This class it only to have 'Debug Remote Setting'.
  */

cls.DebugRemoteSettingView = function(id, name, container_class)
{
  this.is_hidden = true;
  this.createView = function(container)
  {

  };
  this.init(id, name, container_class);
}

cls.DebugRemoteSettingView.create_ui_widgets = function()
{
  const PORT_DEFAULT = 7001;
  const PORT_MIN = 1024;
  const PORT_MAX = 65535;

  new Settings
  (
    // id
    'debug_remote_setting',
    // key-value map
    {
      "debug-remote": false,
      "port": PORT_DEFAULT
    },
    // key-label map
    {
      "debug-remote": ui_strings.S_SWITCH_REMOTE_DEBUG
    },
    // settings map
    {
      customSettings:
      [
        'debug-remote'
      ]
    },
    // custom templates
    {
      'debug-remote':
      function(setting)
      {

        if (!settings.debug_remote_setting.get('debug-remote'))
        {
          Overlay.get_instance().set_info_content(
            [
              ["p", ui_strings.S_REMOTE_DEBUG_GUIDE_PRECONNECT_HEADER],
              ["ol",
                ["li", ui_strings.S_REMOTE_DEBUG_GUIDE_PRECONNECT_STEP_1],
                ["li", ui_strings.S_REMOTE_DEBUG_GUIDE_PRECONNECT_STEP_2]
              ]
            ]
          );

          return [
            ['setting-composite',
              window.templates.remote_debug_settings(setting.get('port'))
            ]
          ]
        }
        else
        {
          return ['setting-composite',
            ['span',
              ui_strings.S_BUTTON_CANCEL_REMOTE_DEBUG,
              'handler', 'cancel-remote-debug',
              'class', 'ui-button',
              'tabindex', '1'
            ]
          ]
        }
      }
    },
    "remote_debug"
  );

  eventHandlers.click['apply-remote-debugging'] = function(event, target)
  {
    var port = parseInt(target.parentNode.getElementsByTagName('input')[0].value);
    if (typeof port == 'number')
    {
      if (PORT_MIN <= port && port <= PORT_MAX)
      {
        settings.debug_remote_setting.set('debug-remote', true);
        settings.debug_remote_setting.set('port', port);
        // for older clients
        window.helpers.setCookie('debug-remote', "true");
        window.helpers.setCookie('port', JSON.stringify(port));
        client.setup(true);
      }
      else
      {
        // TODO: fix string to show new min port number
        document.getElementById("remote-debug-info").textContent =
            ui_strings.S_INFO_NO_VALID_PORT_NUMBER.replace("%s", PORT_MIN)
                                                  .replace("%s", PORT_MAX);
        target.parentNode.getElementsByTagName('input')[0].value =
            port < PORT_MIN ? PORT_MIN : PORT_MAX;
      }
    }
  };

  eventHandlers.click['cancel-remote-debug'] = function(event, target)
  {
    Overlay.get_instance().hide();
    settings.debug_remote_setting.set('debug-remote', false);
    window.helpers.setCookie('debug-remote', "false");
    client.setup();
  };
};

/**
  * @constructor
  * @extends ViewBase
  * Settings are bound to a view. This class it only to have 'General Settings'.
  */

cls.ModebarView = function(id, name, container_class)
{
  this.is_hidden = true;
  this.createView = function(container) {};
  this.init(id, name, container_class);
};

cls.MainView = function(){};

cls.MainView .create_ui_widgets = function()
{

  // TODO clean up

  new ToolbarConfig
  (
    'main-view',
    [
      {
        handler: 'toggle-console',
        title: ui_strings.S_BUTTON_TOGGLE_CONSOLE
      },
      {
        handler: 'toggle-settings-overlay',
        title: ui_strings.S_BUTTON_TOGGLE_SETTINGS
      },
      {
        handler: 'toggle-remote-debug-overlay',
        title: ui_strings.S_BUTTON_TOGGLE_REMOTE_DEBUG
      }
    ],
    null,
    null,
    [
      //{
      //  handler: 'select-window',
      //  title: ui_strings.S_BUTTON_LABEL_SELECT_WINDOW,
      //  type: 'dropdown',
      //  class: 'window-select-dropdown',
      //  template: function()
      //  {
      //    return (
      //    ['window-select',
      //      [
      //        'select',
      //        'handler', this.handler
      //      ]
      //    ]);
      //  }
      //}
    ]
  )

  eventHandlers.click['reload-window'] = function(event, target)
  {
    var window_id = Number(target.get_attr("parent-node-chain", "data-reload-window-id"));
    runtimes.reloadWindow(window_id);
  }
}
