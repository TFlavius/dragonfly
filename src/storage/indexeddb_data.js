window.cls || (window.cls = {});

cls.IndexedDBData = function(service, tag_manager, message_bus, runtimes, scope_service)
{
  const SUCCESS = 0;
  const SERVICE_ALREADY_ENABLED = 9;

  this.service = service || window.services["indexed-db"];
  this.scope_service = scope_service || window.services.scope;
  this.tag_manager = tag_manager || window.tag_manager;
  this.messages = message_bus || window.messages;
  this.runtimes = runtimes || window.runtimes;
  this.runtime_id = 0;
  this.databases = [];
  this.schema = null;
  this.entries = [];
  this.database_index = -1;
  this.store_index = -1;
  this.index_index = -1;
  this.page_index = 0;
  this.page_cursors = [{key: null, primary_key: null}];
  this.has_more = false;
  this.next_cursor = null;
  this.state = "idle";
  this.error = "";
  this._generation = 0;
  this._next_operation_id = 0;
  this._pending = {};
  this._enable_pending = false;
  this._enable_waiters = [];
  this._enable_epoch = 0;

  this.is_available = function()
  {
    return Boolean(this.service && this.service.is_implemented && this.service.requestListDatabases);
  };

  this.get_runtime = function()
  {
    return this.runtimes && this.runtime_id ? this.runtimes.getRuntime(this.runtime_id) : null;
  };

  this.get_database = function()
  {
    return this.database_index >= 0 ? this.databases[this.database_index] : null;
  };

  this.get_store = function()
  {
    var stores = this.schema && this.schema.object_stores || [];
    return this.store_index >= 0 ? stores[this.store_index] : null;
  };

  this.get_index = function()
  {
    var store = this.get_store();
    return store && this.index_index >= 0 ? store.indexes[this.index_index] : null;
  };

  this._post_update = function()
  {
    if (this.messages)
      this.messages.post("indexeddb-update", {model: this});
  };

  this._format_error = function(status, message)
  {
    var description = "";
    if (typeof message == "string")
      description = message;
    else if (message && typeof message.description == "string")
      description = message.description;
    else if (message instanceof Array)
      for (var i = 0; i < message.length && !description; ++i)
        if (typeof message[i] == "string")
          description = message[i];
    return description || "IndexedDB request failed (status " + status + ")";
  };

  this._set_error = function(status, message)
  {
    this.state = "error";
    this.error = this._format_error(status, message);
    this._post_update();
  };

  this._allocate_operation_id = function()
  {
    do
    {
      this._next_operation_id = this._next_operation_id >= 0xffffffff ? 1 : this._next_operation_id + 1;
    }
    while (this._pending[this._next_operation_id]);
    return this._next_operation_id;
  };

  this._cancel_pending = function()
  {
    if (this.service && this.service.requestCancel)
      for (var operation_id in this._pending)
        this.service.requestCancel(cls.TagManager.IGNORE_RESPONSE, [Number(operation_id)]);
    this._pending = {};
  };

  this._ensure_enabled = function(callback, generation)
  {
    if (this.service.is_enabled)
    {
      callback.call(this);
      return;
    }
    if (!this.scope_service || !this.scope_service.requestEnable)
    {
      this.state = "unavailable";
      this.error = "";
      this._post_update();
      return;
    }
    this._enable_waiters.push({callback: callback, generation: generation});
    if (this._enable_pending)
      return;
    this._enable_pending = true;
    var enable_epoch = ++this._enable_epoch;
    var tag = this.tag_manager.set_callback(this, function(status)
    {
      if (enable_epoch != this._enable_epoch)
        return;
      this._enable_pending = false;
      var waiters = this._enable_waiters;
      this._enable_waiters = [];
      if (status != SUCCESS && status != SERVICE_ALREADY_ENABLED)
      {
        this._set_error(status, "Could not enable IndexedDB inspection");
        return;
      }
      this.service.is_enabled = true;
      for (var index = 0; index < waiters.length; ++index)
        if (waiters[index].generation == this._generation)
          waiters[index].callback.call(this);
    });
    this.scope_service.requestEnable(tag, ["indexed-db"]);
  };

  this._new_generation = function()
  {
    this._cancel_pending();
    return ++this._generation;
  };

  this._request = function(method, arguments_after_operation_id, callback, generation)
  {
    if (!this.is_available() || typeof this.service[method] != "function")
    {
      this.state = "unavailable";
      this.error = "";
      this._post_update();
      return 0;
    }
    if (!this.service.is_enabled)
    {
      this._ensure_enabled(function()
      {
        this._request(method, arguments_after_operation_id, callback, generation);
      }, generation);
      return 0;
    }
    var operation_id = this._allocate_operation_id();
    var tag = this.tag_manager.set_callback(this, this._on_response, [operation_id, generation, callback]);
    this._pending[operation_id] = true;
    this.service[method](tag, [this.runtime_id, operation_id].concat(arguments_after_operation_id || []));
    return operation_id;
  };

  this._on_response = function(status, message, operation_id, generation, callback)
  {
    delete this._pending[operation_id];
    if (generation != this._generation)
      return;
    if (status != SUCCESS)
    {
      this._set_error(status, message);
      return;
    }
    callback.call(this, message || []);
  };

  this._reset_selection = function()
  {
    this.schema = null;
    this.entries = [];
    this.database_index = -1;
    this.store_index = -1;
    this.index_index = -1;
    this.page_index = 0;
    this.page_cursors = [{key: null, primary_key: null}];
    this.has_more = false;
    this.next_cursor = null;
  };

  this.refresh = function(runtime_id)
  {
    var selected_runtime = runtime_id || this.runtimes && this.runtimes.getSelectedRuntimeId();
    var generation = this._new_generation();
    if (!this.is_available())
    {
      this.state = "unavailable";
      this.runtime_id = selected_runtime || 0;
      this._reset_selection();
      this.databases = [];
      this.error = "";
      this._post_update();
      return;
    }
    if (!selected_runtime)
    {
      this.state = "no-runtime";
      this.runtime_id = 0;
      this._reset_selection();
      this.databases = [];
      this.error = "";
      this._post_update();
      return;
    }
    var previous_database = this.get_database();
    var previous_name = this.runtime_id == selected_runtime && previous_database ? previous_database.name : null;
    this.runtime_id = selected_runtime;
    this.state = "loading";
    this.error = "";
    this._post_update();
    this._request("requestListDatabases", [], function(message)
    {
      var database_list = message[0] || [];
      this.databases = database_list.map(function(database)
      {
        return {name: database[0], version: database[1]};
      });
      this._reset_selection();
      if (!this.databases.length)
      {
        this.state = "ready";
        this._post_update();
        return;
      }
      var selected_index = 0;
      for (var i = 0; previous_name != null && i < this.databases.length; ++i)
        if (this.databases[i].name == previous_name)
          selected_index = i;
      this.select_database(selected_index);
    }, generation);
  };

  this.select_database = function(index)
  {
    if (index < 0 || index >= this.databases.length)
      return;
    var generation = this._new_generation();
    this.database_index = index;
    this.schema = null;
    this.entries = [];
    this.store_index = -1;
    this.index_index = -1;
    this.page_index = 0;
    this.page_cursors = [{key: null, primary_key: null}];
    this.has_more = false;
    this.next_cursor = null;
    this.state = "loading";
    this.error = "";
    this._post_update();
    this._request("requestGetDatabaseSchema", [this.databases[index].name], function(message)
    {
      this.schema = {
        name: message[0],
        version: message[1],
        object_stores: (message[2] || []).map(function(store)
        {
          return {
            name: store[0],
            key_path: store[1],
            auto_increment: store[2],
            indexes: (store[3] || []).map(function(index_info)
            {
              return {name: index_info[0], key_path: index_info[1], unique: index_info[2], multi_entry: index_info[3]};
            })
          };
        })
      };
      if (this.schema.object_stores.length)
        this.select_store(0);
      else
      {
        this.state = "ready";
        this._post_update();
      }
    }, generation);
  };

  this.select_store = function(index)
  {
    if (!this.schema || index < 0 || index >= this.schema.object_stores.length)
      return;
    this._new_generation();
    this.store_index = index;
    this.index_index = -1;
    this.page_index = 0;
    this.page_cursors = [{key: null, primary_key: null}];
    this.entries = [];
    this.has_more = false;
    this.next_cursor = null;
    this._read_entries();
  };

  this.select_index = function(index)
  {
    var store = this.get_store();
    if (!store || index < -1 || index >= store.indexes.length)
      return;
    this._new_generation();
    this.index_index = index;
    this.page_index = 0;
    this.page_cursors = [{key: null, primary_key: null}];
    this.entries = [];
    this.has_more = false;
    this.next_cursor = null;
    this._read_entries();
  };

  this._read_entries = function()
  {
    var database = this.get_database();
    var store = this.get_store();
    if (!database || !store)
      return;
    var generation = this._generation;
    var index = this.get_index();
    var cursor = this.page_cursors[this.page_index] || this.page_cursors[0];
    this.state = "loading";
    this.error = "";
    this._post_update();
    this._request("requestReadEntries", [database.name, store.name, index ? index.name : null, 50, cursor.key, cursor.primary_key], function(message)
    {
      this.entries = (message[0] || []).map(function(entry)
      {
        return {key: entry[0], primary_key: entry[1], value: entry[2], primary_key_token: entry[3], attachments: (entry[4] || []).map(function(attachment)
        {
          return {kind: attachment[0], size: attachment[1], type: attachment[2], name: attachment[3], last_modified: attachment[4]};
        }), value_truncated: Boolean(entry[5])};
      });
      this.has_more = Boolean(message[1]);
      this.next_cursor = this.has_more ? {key: message[2], primary_key: message[3]} : null;
      if (!this.entries.length && this.page_index > 0)
      {
        --this.page_index;
        this.page_cursors.length = this.page_index + 1;
        this._new_generation();
        this._read_entries();
        return;
      }
      this.state = "ready";
      this._post_update();
    }, generation);
  };

  this.refresh_entries = function()
  {
    this._new_generation();
    this._read_entries();
  };

  this.next_page = function()
  {
    if (!this.next_cursor)
      return;
    this.page_cursors.length = this.page_index + 1;
    this.page_cursors.push(this.next_cursor);
    ++this.page_index;
    this._new_generation();
    this._read_entries();
  };

  this.previous_page = function()
  {
    if (!this.page_index)
      return;
    --this.page_index;
    this.page_cursors.length = this.page_index + 1;
    this._new_generation();
    this._read_entries();
  };

  this.delete_record = function(index)
  {
    var database = this.get_database();
    var store = this.get_store();
    var entry = this.entries[index];
    if (!database || !store || !entry)
      return;
    var generation = this._new_generation();
    this.state = "loading";
    this._post_update();
    this._request("requestDeleteRecord", [database.name, store.name, entry.primary_key_token], function()
    {
      this._new_generation();
      this._read_entries();
    }, generation);
  };

  this.clear_store = function()
  {
    var database = this.get_database();
    var store = this.get_store();
    if (!database || !store)
      return;
    var generation = this._new_generation();
    this.state = "loading";
    this._post_update();
    this._request("requestClearObjectStore", [database.name, store.name], function()
    {
      this.page_index = 0;
      this.page_cursors = [{key: null, primary_key: null}];
      this._new_generation();
      this._read_entries();
    }, generation);
  };

  this.delete_database = function()
  {
    var database = this.get_database();
    if (!database)
      return;
    var generation = this._new_generation();
    this.state = "loading";
    this._post_update();
    this._request("requestDeleteDatabase", [database.name], function()
    {
      this.refresh(this.runtime_id);
    }, generation);
  };

  this._on_runtime_selected = function(message)
  {
    if (message && message.id && message.id != this.runtime_id)
      this.refresh(message.id);
  };

  this._on_active_tab = function(message)
  {
    var selected = this.runtimes && this.runtimes.getSelectedRuntimeId();
    selected = selected || message && message.activeTab && message.activeTab[0];
    if (selected && selected != this.runtime_id)
      this.refresh(selected);
  };

  this._on_runtime_destroyed = function(message)
  {
    if (message && message.id == this.runtime_id)
    {
      this._new_generation();
      this.runtime_id = 0;
      this.databases = [];
      this._reset_selection();
      this.state = "no-runtime";
      this.error = "";
      this._post_update();
    }
  };

  this._on_reset = function()
  {
    this._new_generation();
    this._enable_pending = false;
    this._enable_waiters = [];
    ++this._enable_epoch;
    if (this.service)
      this.service.is_enabled = false;
    this.runtime_id = 0;
    this.databases = [];
    this._reset_selection();
    this.state = this.is_available() ? "no-runtime" : "unavailable";
    this.error = "";
    this._post_update();
  };

  if (this.messages)
  {
    this.messages.addListener("runtime-selected", this._on_runtime_selected.bind(this));
    this.messages.addListener("active-tab", this._on_active_tab.bind(this));
    this.messages.addListener("runtime-destroyed", this._on_runtime_destroyed.bind(this));
    this.messages.addListener("reset-state", this._on_reset.bind(this));
    this.messages.addListener("profile-enabled", function(message)
    {
      if (!message || message.profile == window.app.profiles.DEFAULT)
        this.refresh();
    }.bind(this));
  }
};
