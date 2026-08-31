window.cls || (window.cls = {});

cls.IndexedDBViewActions = function(id, model)
{
  this.id = id;
  this.shared_shortcuts = "storage";
  ActionHandlerInterface.apply(this);

  this._handlers["refresh"] = function() { model.refresh(); };
  this._handlers["refresh-entries"] = function() { model.refresh_entries(); };
  this._handlers["select-database"] = function(event, target) { model.select_database(Number(target.getAttribute("data-index"))); };
  this._handlers["select-store"] = function(event, target) { model.select_store(Number(target.getAttribute("data-index"))); };
  this._handlers["select-index"] = function(event, target) { model.select_index(Number(target.getAttribute("data-index"))); };
  this._handlers["previous-page"] = function() { model.previous_page(); };
  this._handlers["next-page"] = function() { model.next_page(); };
  this._handlers["delete-record"] = function(event, target)
  {
    var index = Number(target.getAttribute("data-index"));
    var entry = model.entries[index];
    if (entry && confirm(ui_strings.D_INDEXED_DB_DELETE_RECORD.replace("%s", entry.primary_key)))
      model.delete_record(index);
  };
  this._handlers["clear-store"] = function()
  {
    var store = model.get_store();
    if (store && confirm(ui_strings.D_INDEXED_DB_CLEAR_STORE.replace("%s", store.name)))
      model.clear_store();
  };
  this._handlers["delete-database"] = function()
  {
    var database = model.get_database();
    if (database && confirm(ui_strings.D_INDEXED_DB_DELETE_DATABASE.replace("%s", database.name)))
      model.delete_database();
  };

  ActionBroker.get_instance().register_handler(this);
};

window.eventHandlers.click["indexeddb-action"] = function(event, target)
{
  this.broker.dispatch_action("indexed_db", target.getAttribute("data-action"), event, target);
};
