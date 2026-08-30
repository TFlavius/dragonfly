window.templates || (window.templates = {});

window.templates.indexed_db = {
  button: function(label, action, attribute, value, disabled, danger)
  {
    var template = ["button", label, "type", "button", "handler", "indexeddb-action", "data-action", action, "class", "ui-button" + (danger ? " indexeddb-danger" : "")];
    if (attribute)
      template.push(attribute, String(value));
    if (disabled)
      template.push("disabled", "disabled");
    return template;
  },

  attachments: function(attachments)
  {
    if (!attachments.length)
      return "";
    return ["ul", attachments.map(function(attachment)
    {
      var kind = attachment.kind == 2 ? "File" : "Blob";
      var details = kind + ": " + attachment.size + " bytes";
      if (attachment.type)
        details += ", " + attachment.type;
      if (attachment.name != null)
        details += ", " + attachment.name;
      return ["li", details];
    }), "class", "indexeddb-attachments"];
  },

  navigation: function(model)
  {
    var schema = model.schema;
    return ["div", model.databases.map(function(database, database_index)
    {
      var children = [window.templates.indexed_db.button(database.name + " (v" + database.version + ")", "select-database", "data-index", database_index, model.state == "loading")];
      if (database_index == model.database_index && schema)
      {
        children.push(["ul", schema.object_stores.map(function(store, store_index)
        {
          var store_children = [window.templates.indexed_db.button(store.name, "select-store", "data-index", store_index, model.state == "loading")];
          if (store_index == model.store_index)
          {
            var sources = [["li", window.templates.indexed_db.button(ui_strings.S_LABEL_INDEXED_DB_RECORDS, "select-index", "data-index", -1, model.state == "loading")]];
            store.indexes.forEach(function(index, index_index)
            {
              sources.push(["li", window.templates.indexed_db.button(index.name, "select-index", "data-index", index_index, model.state == "loading")]);
            });
            store_children.push(["ul", sources, "class", "indexeddb-index-list"]);
          }
          return ["li", store_children, "class", store_index == model.store_index ? "selected" : ""];
        }), "class", "indexeddb-store-list"]);
      }
      return ["div", children, "class", "indexeddb-database" + (database_index == model.database_index ? " selected" : "")];
    }), "class", "indexeddb-navigation"];
  },

  entries: function(model)
  {
    var rows = model.entries.map(function(entry, index)
    {
      return ["tr", [
        ["td", entry.key],
        ["td", entry.primary_key],
        ["td", [
          ["pre", entry.value + (entry.value_truncated ? "..." : "")],
          window.templates.indexed_db.attachments(entry.attachments)
        ]],
        ["td", window.templates.indexed_db.button(ui_strings.S_LABEL_INDEXED_DB_DELETE_RECORD, "delete-record", "data-index", index, model.state == "loading", true)]
      ]];
    });
    if (!rows.length)
      rows.push(["tr", ["td", ui_strings.S_INFO_INDEXED_DB_EMPTY_STORE, "colspan", "4", "class", "info-box"]]);
    return ["div", [
      ["table", [
        ["thead", ["tr", [
          ["th", ui_strings.S_LABEL_STORAGE_KEY],
          ["th", ui_strings.S_LABEL_INDEXED_DB_PRIMARY_KEY],
          ["th", ui_strings.S_LABEL_COOKIE_MANAGER_COOKIE_VALUE],
          ["th", ""]
        ]]],
        ["tbody", rows]
      ], "class", "indexeddb-entry-table"],
      ["div", [
        window.templates.indexed_db.button(ui_strings.S_LABEL_INDEXED_DB_PREVIOUS_PAGE, "previous-page", null, null, !model.page_index || model.state == "loading"),
        ["span", ui_strings.S_LABEL_INDEXED_DB_PAGE.replace("%s", model.page_index + 1), "class", "indexeddb-page-number"],
        window.templates.indexed_db.button(ui_strings.S_LABEL_INDEXED_DB_NEXT_PAGE, "next-page", null, null, !model.has_more || model.state == "loading")
      ], "class", "indexeddb-pagination"]
    ], "class", "indexeddb-entries"];
  },

  panel: function(model)
  {
    var runtime = model.get_runtime();
    var runtime_label = runtime && (runtime.title || runtime.uri) || (model.runtime_id ? "Runtime " + model.runtime_id : "");
    var toolbar = ["div", [
      ["strong", ui_strings.M_VIEW_LABEL_INDEXED_DB],
      ["span", runtime_label, "class", "indexeddb-runtime"],
      window.templates.indexed_db.button(ui_strings.S_LABEL_STORAGE_UPDATE, "refresh", null, null, model.state == "loading")
    ], "class", "indexeddb-toolbar"];
    if (model.state == "unavailable")
      return ["div", [toolbar, ["div", ui_strings.S_INFO_INDEXED_DB_UNAVAILABLE, "class", "info-box"]], "class", "indexeddb-panel padding"];
    if (model.state == "no-runtime" || model.state == "idle")
      return ["div", [toolbar, ["div", ui_strings.S_INFO_INDEXED_DB_NO_RUNTIME, "class", "info-box"]], "class", "indexeddb-panel padding"];
    if (model.state == "error")
      return ["div", [toolbar, ["div", model.error, "class", "info-box indexeddb-error"]], "class", "indexeddb-panel padding"];
    var content = [toolbar];
    if (!model.databases.length)
      content.push(["div", ui_strings.S_INFO_INDEXED_DB_NO_DATABASES, "class", "info-box"]);
    else
    {
      content.push(window.templates.indexed_db.navigation(model));
      if (model.schema)
      {
        var database = model.get_database();
        var store = model.get_store();
        var index = model.get_index();
        content.push(["div", [
          ["h2", database.name + " (v" + model.schema.version + ")"],
          window.templates.indexed_db.button(ui_strings.S_LABEL_INDEXED_DB_DELETE_DATABASE, "delete-database", null, null, model.state == "loading", true),
          store ? ["div", [
            ["h3", store.name + (index ? " / " + index.name : "")],
            ["p", ui_strings.S_LABEL_INDEXED_DB_KEY_PATH + ": " + store.key_path + (store.auto_increment ? ", " + ui_strings.S_LABEL_INDEXED_DB_AUTO_INCREMENT : "")],
            window.templates.indexed_db.button(ui_strings.S_LABEL_INDEXED_DB_CLEAR_STORE, "clear-store", null, null, model.state == "loading", true),
            window.templates.indexed_db.button(ui_strings.S_LABEL_STORAGE_UPDATE, "refresh-entries", null, null, model.state == "loading"),
            window.templates.indexed_db.entries(model)
          ]] : ["div", ui_strings.S_INFO_INDEXED_DB_NO_STORES, "class", "info-box"]
        ], "class", "indexeddb-content"]);
      }
    }
    if (model.state == "loading")
      content.push(["div", ui_strings.S_INFO_INDEXED_DB_LOADING, "class", "indexeddb-loading"]);
    return ["div", content, "class", "indexeddb-panel padding"];
  }
};
