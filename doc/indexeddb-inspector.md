# IndexedDB inspector

The IndexedDB tab in the Storage panel uses the host's version 1.0 `indexed-db` Scope service. It does not evaluate helper scripts in the inspected page and never opens persistence files. The service binds requests to the exact selected runtime, so changing the selected document or worker changes the storage context the panel displays.

`IndexedDBData` owns one asynchronous request chain at a time. A runtime change, navigation, explicit refresh or hierarchy selection cancels every superseded host operation and advances a local generation; a late reply from an older generation cannot replace current data. The model first lists databases, then loads the selected schema, then reads one bounded record or index page. Continuation keys and record primary-key tokens are opaque protocol values and are returned to the host unchanged.

The navigation hierarchy is database, object store and index. Selecting Records reads the object store directly; selecting an index displays index keys alongside their primary keys. Values are native, bounded structured-clone previews supplied by the host, and Blob/File rows show metadata only. The panel deliberately offers no arbitrary value editor and no raw SQL or file access.

Deleting a record, clearing an object store and deleting a database each require a confirmation in the client. The client sends only the corresponding high-level Scope command; connection blocking, transactions, quotas and version-change behavior remain the engine's responsibility.

The tab is registered even when the host has no `indexed-db` service, in which case it shows an explicit unavailable message. The service is added to the default Scope profile only when HostInfo advertises it.

`tests/indexeddb.qunit.html` covers service fallback, the database/schema/page request chain, opaque deletion tokens, pagination and cancellation of superseded work. Adding `?report` changes the page title to a machine-readable failure/assertion count after completion, which permits a smoke run in the target Presto browser without requiring a second JavaScript engine.
