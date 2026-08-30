window.cls || (window.cls = {});

cls.IndexedDBView = function(id, name, model)
{
  this.model = model;

  this.createView = function(container)
  {
    var selected_runtime = window.runtimes && window.runtimes.getSelectedRuntimeId();
    var refresh = this.model.state == "idle" || selected_runtime && selected_runtime != this.model.runtime_id;
    container.clearAndRender(window.templates.indexed_db.panel(this.model));
    if (refresh)
      this.model.refresh(selected_runtime);
  };

  this.create_disabled_view = function(container)
  {
    container.clearAndRender(window.templates.indexed_db.panel(this.model));
  };

  window.messages.addListener("indexeddb-update", function(message)
  {
    if (message.model == this.model)
      this.update();
  }.bind(this));

  this.init(id, name, "scroll storage_view indexed_db", null, "storage-view");
};
cls.IndexedDBView.prototype = ViewBase;
