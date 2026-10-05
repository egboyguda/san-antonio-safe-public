import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'app_database.g.dart';

class CacheEntries extends Table {
  TextColumn get id => text()();
  TextColumn get kind => text()();
  TextColumn get data => text()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

class PendingOperations extends Table {
  TextColumn get id => text()();
  TextColumn get type => text()();
  TextColumn get payload => text()();
  TextColumn get state => text().withDefault(const Constant('queued'))();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  IntColumn get nextAttemptAt => integer().nullable()();
  IntColumn get createdAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [CacheEntries, PendingOperations])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(driftDatabase(name: 'san_antonio_safe'));
  AppDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 1;

  Future<void> putCache(String id, String kind, String data) =>
      into(cacheEntries).insertOnConflictUpdate(
        CacheEntriesCompanion.insert(
          id: id,
          kind: kind,
          data: data,
          updatedAt: DateTime.now().millisecondsSinceEpoch,
        ),
      );

  Future<CacheEntry?> getCache(String id) => (select(
    cacheEntries,
  )..where((row) => row.id.equals(id))).getSingleOrNull();

  Future<List<CacheEntry>> getCacheKind(String kind) =>
      (select(cacheEntries)..where((row) => row.kind.equals(kind))).get();

  Future<void> deleteCache(String id) =>
      (delete(cacheEntries)..where((row) => row.id.equals(id))).go();

  Future<List<PendingOperation>> dueOperations() {
    final now = DateTime.now().millisecondsSinceEpoch;
    return (select(pendingOperations)
          ..where(
            (row) =>
                row.state.isIn(['queued', 'failed']) &
                (row.nextAttemptAt.isNull() |
                    row.nextAttemptAt.isSmallerOrEqualValue(now)),
          )
          ..orderBy([(row) => OrderingTerm.asc(row.createdAt)]))
        .get();
  }
}
