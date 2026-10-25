# SQL② 検索・オブジェクト

> S3.1 SQL コマンド（重要度13）の後半。SELECT の各句・結合・サブクエリ・集合演算と、ビュー・インデックス・シーケンス・スキーマ・関数・トリガー。NULL の扱いと「エラーになるのはどれか」が頻出。

## 1. SELECT の基本と評価順序 ★★★

```sql
SELECT   cat_id, count(*) AS cnt        -- 5. 列を選ぶ
FROM     products                        -- 1. 対象テーブル
WHERE    price >= 100                    -- 2. 行を絞る
GROUP BY cat_id                          -- 3. グループ化
HAVING   count(*) >= 2                   -- 4. グループを絞る
ORDER BY cnt DESC                        -- 6. 並べ替え
LIMIT    10;                             -- 7. 件数を制限
```

- 評価順: **FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT / OFFSET**
- ⚠ SELECT で付けた**列の別名**（`AS cnt`）は **ORDER BY では使えるが、WHERE では使えない**（WHERE の時点ではまだ存在しない）
- `AS` は省略できる（`count(*) cnt`）。別名に大文字・空白を含めるときは二重引用符
- `SELECT 1 + 1;` のように **FROM 句なしでも実行できる**（PostgreSQL の特徴）

### ORDER BY

- `ORDER BY 列 [ASC | DESC]`。デフォルトは **ASC（昇順）**。列番号（`ORDER BY 2`）や別名も使える
- 複数指定すると、前の列が同じ値のときに次の列で並べる
- ⚠ NULL は**最も大きい値**として扱う → **ASC では最後、DESC では先頭**。`NULLS FIRST` / `NULLS LAST` で変えられる
- ORDER BY がないと**行の順序は保証されない**

### LIMIT / OFFSET

- `LIMIT n`: 先頭 n 行だけ返す。`OFFSET m`: 先頭 m 行を**飛ばす**
- `LIMIT 10 OFFSET 20` → 21〜30行目
- SQL 標準の書き方: `OFFSET 20 ROWS FETCH FIRST 10 ROWS ONLY`

### DISTINCT

- `SELECT DISTINCT cat_id FROM products;` 重複行を1つにまとめる（NULL 同士も1つにまとまる）
- `DISTINCT ON (式)`: 式の値ごとに**先頭の1行だけ**を返す（PostgreSQL 独自）。ORDER BY の先頭は DISTINCT ON の式と一致させる

```sql
-- カテゴリごとに最も高い商品を1件ずつ
SELECT DISTINCT ON (cat_id) cat_id, name, price
FROM products ORDER BY cat_id, price DESC;
```

## 2. WHERE の条件 ★★★

| 演算子 | 例 | 意味 |
|---|---|---|
| 比較 | `=`、`<>`（`!=` も可）、`<`、`<=`、`>`、`>=` | |
| **BETWEEN** | `price BETWEEN 100 AND 200` | 100 以上 200 **以下**（**両端を含む**） |
| **IN** | `cat_id IN (1, 3, 5)` | いずれかに一致 |
| **LIKE** | `name LIKE 'A%'` | パターン一致（大文字小文字を**区別する**） |
| **ILIKE** | `name ILIKE 'a%'` | 大文字小文字を**区別しない** LIKE（PostgreSQL 独自） |
| **SIMILAR TO** | `name SIMILAR TO '[AB]%'` | SQL 標準の正規表現風パターン |
| **~** | `name ~ '^A.*z$'` | POSIX 正規表現（`~*` は大文字小文字を区別しない、`!~` は否定） |
| **IS NULL** | `price IS NULL` | NULL かどうか |
| **IS DISTINCT FROM** | `a IS DISTINCT FROM b` | NULL も値として比較する `<>`（NULL と NULL は「同じ」） |

### LIKE のワイルドカード

- **`%`**: 0文字以上の任意の文字列
- **`_`**: **ちょうど1文字**
- `%` や `_` 自体を探すときは**エスケープ文字（デフォルトは `\`）**を前に付ける（`LIKE '100\%'`）。`ESCAPE '#'` で変更できる
- ⚠ `LIKE` は**全体一致**。`name LIKE 'abc'` は `name = 'abc'` と同じ（部分一致には `%` が要る）

### NULL と論理演算

- NULL を含む比較は **UNKNOWN**（NULL）になり、WHERE では**偽と同じく行が除外**される
- AND / OR の3値論理

| A | B | A AND B | A OR B |
|---|---|---|---|
| TRUE | NULL | **NULL** | **TRUE** |
| FALSE | NULL | **FALSE** | **NULL** |
| NULL | NULL | NULL | NULL |

- NULL（UNKNOWN）を NOT で否定しても NULL のまま
- ⚠ **`NOT IN` のリスト（サブクエリ結果）に NULL が1つでも含まれると、結果は0行**（すべて UNKNOWN になるため）

## 3. 集約関数と GROUP BY ★★★

| 関数 | 内容 | NULL の扱い |
|---|---|---|
| **count(\*)** | 行数 | **NULL の行も数える** |
| **count(列)** | 列が NULL でない行の数 | NULL を除く |
| **count(DISTINCT 列)** | 重複を除いた値の数 | NULL を除く |
| **sum / avg** | 合計 / 平均 | NULL を除いて計算 |
| **max / min** | 最大 / 最小 | NULL を除く |

- ⚠ 対象が0行のとき: **count は 0**、**sum・avg・max・min は NULL**
- ⚠ avg は NULL を**分母に含めない**（値 10, 20, NULL の avg は 15。20 ではない）
- 文字列の連結は `string_agg(列, ',')`、配列にまとめるのは `array_agg(列)`（→ 04章）

### GROUP BY / HAVING

- GROUP BY の列の値が同じ行を1グループにまとめ、グループごとに集約する
- ⚠ GROUP BY を使うと、SELECT に書けるのは **GROUP BY の列・集約関数・定数**だけ（それ以外の列はエラー。ただし GROUP BY に主キーを書いた場合、そのテーブルの他の列は書ける）
- ⚠ **集約関数は WHERE に書けない** → グループに対する条件は **HAVING** に書く
- WHERE は**グループ化の前**に行を絞り、HAVING は**グループ化の後**にグループを絞る
- GROUP BY がなくても集約関数を使えば、全体が1グループになる
- GROUP BY では NULL も1つのグループにまとまる

## 4. 結合（JOIN）★★★

| 結合 | 結果 |
|---|---|
| **INNER JOIN**（`JOIN` だけでも同じ） | 結合条件に一致する行だけ |
| **LEFT [OUTER] JOIN** | 左表の全行＋一致する右表の行（なければ右表の列は **NULL**） |
| **RIGHT [OUTER] JOIN** | 右表の全行＋一致する左表の行 |
| **FULL [OUTER] JOIN** | 両表の全行（一致しない側は NULL） |
| **CROSS JOIN** | **直積**（全組み合わせ。m 行 × n 行 = m×n 行）。結合条件なし |

```sql
SELECT p.name, c.name
FROM products p
LEFT JOIN categories c ON p.cat_id = c.id;
```

### 結合条件の書き方

- **`ON 条件`**: 任意の条件
- **`USING (列名)`**: 両表の**同名の列**で等価結合。結果にその列は**1つだけ**現れる
- **`NATURAL JOIN`**: **同名の列すべて**で自動的に等価結合（意図しない列で結合しやすい）
- 古い書き方: `FROM a, b WHERE a.id = b.a_id`（カンマは CROSS JOIN と同じ。WHERE で絞ると内部結合と同じ結果）
- **自己結合**: 同じテーブルに別名を付けて結合（`FROM emp e JOIN emp m ON e.boss_id = m.id`）
- ⚠ 外部結合で右表の条件を **WHERE** に書くと、NULL の行が除外されて**内部結合と同じ結果**になる。残したいときは **ON** に書く

## 5. サブクエリ ★★★

| 種類 | 例 | 注意 |
|---|---|---|
| **スカラサブクエリ** | `WHERE price > (SELECT avg(price) FROM products)` | ⚠ **2行以上返すとエラー**。0行なら NULL |
| **IN** | `WHERE cat_id IN (SELECT id FROM categories WHERE ...)` | 複数行を返してよい |
| **EXISTS** | `WHERE EXISTS (SELECT 1 FROM orders o WHERE o.pid = p.id)` | **1行でも返れば真**。SELECT の列は何でもよい |
| **ANY / SOME** | `WHERE price > ANY (SELECT ...)` | いずれか1つと比較して真なら真（`= ANY` は IN と同じ） |
| **ALL** | `WHERE price > ALL (SELECT ...)` | すべてと比較して真なら真（0行なら真） |
| **FROM 句** | `FROM (SELECT ...) AS sub` | ⚠ PostgreSQL 14 では**別名が必須**（省略するとエラー） |

- **相関サブクエリ**: 外側のクエリの列を参照するサブクエリ。外側の**1行ごとに**評価される（EXISTS の例）

## 6. 集合演算 ★★

| 演算 | 結果 |
|---|---|
| **UNION** | 和。**重複を除く** |
| **UNION ALL** | 和。**重複を残す**（重複除去しない分速い） |
| **INTERSECT** | 共通部分 |
| **EXCEPT** | 差（左にあって右にない行）。Oracle の MINUS に当たる |

- ⚠ 2つの SELECT の**列の数が同じ**で、対応する列の**データ型に互換性**がないとエラー
- 結果の列名は**最初の SELECT** の列名
- ORDER BY は**最後に1つだけ**書き、全体を並べ替える
- INTERSECT ALL / EXCEPT ALL も使える

## 7. 条件式・CTE・ウィンドウ関数 ★★

### CASE

```sql
-- 検索 CASE
SELECT name, CASE WHEN price >= 1000 THEN '高' WHEN price >= 100 THEN '中' ELSE '低' END
FROM products;

-- 単純 CASE
SELECT CASE cat_id WHEN 1 THEN '果物' WHEN 2 THEN '野菜' END FROM products;
```

- 上の WHEN から順に評価し、**最初に真になった THEN** を返す
- ⚠ **ELSE を省略して、どれにも当てはまらないと NULL**
- ⚠ 単純 CASE で `CASE x WHEN NULL` と書いても NULL には一致しない（`=` で比較するため）

### WITH 句（共通テーブル式・CTE）

```sql
WITH expensive AS (
    SELECT * FROM products WHERE price >= 1000
)
SELECT cat_id, count(*) FROM expensive GROUP BY cat_id;
```

- クエリの中だけで使える**名前付きの一時的な結果**。サブクエリを読みやすくする
- **`WITH RECURSIVE`**: 自分自身を参照して再帰処理（階層構造の展開、連番の生成など）

### ウィンドウ関数

- `関数() OVER (PARTITION BY 列 ORDER BY 列)`: 行をまとめずに、グループ内での順位・累計などを各行に付ける
- 主な関数: **row_number()**（連番）、**rank()**（同順位の次は飛ぶ: 1,1,3）、**dense_rank()**（飛ばない: 1,1,2）、集約関数（`sum(price) OVER (...)`）
- ⚠ GROUP BY と違い、**行数は減らない**

## 8. スキーマ ★★

- **データベース → スキーマ → テーブルなどのオブジェクト** の階層。スキーマはオブジェクトをまとめる名前空間
- 別のスキーマなら同じ名前のテーブルを作れる。`スキーマ名.テーブル名` で指定する
- 新しいデータベースには **public** スキーマがある。スキーマを指定しないと public に作られる（通常）
- ⚠ **別のデータベース**のテーブルは1つのクエリで参照**できない**（スキーマは参照できる）

| 操作 | 構文 |
|---|---|
| 作成 | `CREATE SCHEMA s;`（`AUTHORIZATION ユーザー名` で所有者を指定） |
| 変更 | `ALTER SCHEMA s RENAME TO s2;` / `ALTER SCHEMA s OWNER TO alice;` |
| 削除 | `DROP SCHEMA s;`（中にオブジェクトがあればエラー。`CASCADE` で中身ごと削除） |

### search_path

- スキーマ名を省略したときに**探すスキーマの順番**
- デフォルトは **`"$user", public`**（ユーザー名と同じ名前のスキーマ → public）
- オブジェクトを作るときは、search_path の中で**最初に存在するスキーマ**に作られる
- 確認: `SHOW search_path;` 変更: `SET search_path TO s, public;`
- システムカタログの **pg_catalog** スキーマは、search_path に書かなくても**常に最初に**検索される
- ⚠ PostgreSQL 14 までは、public スキーマに**誰でもオブジェクトを作れる**（15 から作成権限が既定で外された）

## 9. ビュー ★★★

```sql
CREATE VIEW expensive_products AS
SELECT id, name, price FROM products WHERE price >= 1000;
```

- SELECT 文に名前を付けたもの。**データは持たず**、参照するたびに元の SELECT を実行する
- **`CREATE OR REPLACE VIEW`**: 既存のビューを置き換える。⚠ ただし**列の削除・名前変更・型変更はできず、末尾への列追加だけ**できる
- `ALTER VIEW v RENAME TO v2;`（名前・所有者などの変更）。⚠ **定義（SELECT 文）は ALTER VIEW で変えられない** → `CREATE OR REPLACE VIEW` か作り直し
- `DROP VIEW v;`
- ⚠ ビューが参照しているテーブルは、`DROP TABLE ... CASCADE` でないと削除できない（CASCADE ならビューも消える）

### 更新可能ビュー

- 次の条件を満たす**単純なビュー**は、INSERT / UPDATE / DELETE が自動的に元テーブルへ反映される
  - FROM に**テーブル（またはビュー）が1つだけ**
  - **集約関数・GROUP BY・HAVING・DISTINCT・LIMIT/OFFSET・UNION 等の集合演算・WITH・ウィンドウ関数を含まない**
- それ以外のビューは、`INSTEAD OF` トリガーやルールを作れば更新できる
- **`WITH CHECK OPTION`**: ビューの WHERE 条件を満たさない行を、ビュー経由で追加・更新できなくする

### マテリアライズドビュー

- `CREATE MATERIALIZED VIEW mv AS SELECT ...;` 検索結果を**実データとして保存**する。参照が速い
- ⚠ 元テーブルを変更しても**自動では反映されない** → **`REFRESH MATERIALIZED VIEW mv;`** で更新
- インデックスを作れる。直接 INSERT / UPDATE はできない

## 10. インデックス ★★★

```sql
CREATE INDEX idx_products_name ON products (name);
CREATE UNIQUE INDEX idx_products_code ON products (code);    -- 一意インデックス
CREATE INDEX ON products (cat_id, price);                     -- 複数列。名前は省略可（自動命名）
CREATE INDEX idx_lower_name ON products (lower(name));        -- 式インデックス
CREATE INDEX idx_active ON products (name) WHERE deleted = false;  -- 部分インデックス
CREATE INDEX idx_tags ON products USING gin (tags);           -- 方式の指定
DROP INDEX idx_products_name;
```

- 検索（WHERE・JOIN・ORDER BY）を速くする。代わりに**更新は遅くなり、領域を使う**
- デフォルトの方式は **B-tree**（等価・範囲検索・ソートに使える）
- **式インデックス**: `WHERE lower(name) = 'abc'` のように**同じ式**で検索したときに使われる
- **部分インデックス**: 条件に合う行だけを索引に入れる
- **`CREATE INDEX CONCURRENTLY`**: テーブルへの書き込みを**止めずに**作成（時間はかかる。トランザクションブロック内では実行できない）
- `REINDEX INDEX 名前;` / `REINDEX TABLE t;` でインデックスを作り直す
- `ALTER INDEX 名前 RENAME TO 新名;` / `ALTER INDEX 名前 SET TABLESPACE ts;`。⚠ 対象の列や式は ALTER INDEX で変えられない → 作り直す
- ⚠ `LIKE 'abc%'`（前方一致）は B-tree が使える場合があるが、**`LIKE '%abc'`（後方・中間一致）は B-tree を使えない**
- ⚠ インデックスはテーブルに属し、**DROP TABLE で一緒に削除**される

## 11. シーケンスと自動採番 ★★★

### シーケンス

```sql
CREATE SEQUENCE seq_order START 100 INCREMENT 10;
SELECT nextval('seq_order');    -- 100
SELECT nextval('seq_order');    -- 110
SELECT currval('seq_order');    -- 110（このセッションで最後に nextval した値）
SELECT setval('seq_order', 500);  -- 次の nextval は 510
```

| 関数 | 動作 |
|---|---|
| **nextval('名前')** | 値を進めて返す |
| **currval('名前')** | **そのセッション**で最後に nextval が返した値。⚠ セッション内で一度も nextval していないと**エラー** |
| **lastval()** | そのセッションで最後に使った（どれかの）シーケンスの値 |
| **setval('名前', n)** | 現在値を n にする → **次の nextval は n + 増分**。`setval('名前', n, false)` なら次の nextval は **n** |

- オプション: `START`（初期値・デフォルト1）、`INCREMENT`（増分・負も可）、`MINVALUE`、`MAXVALUE`、`CYCLE`（最大値に達したら最小値に戻る。デフォルトは NO CYCLE で、達するとエラー）、`CACHE`
- 変更は `ALTER SEQUENCE`（`INCREMENT` などのオプションを変える）。**`ALTER SEQUENCE seq RESTART WITH 1;`** で番号を振り直す（WITH 省略なら START の値から）
- `DROP SEQUENCE seq;`
- ⚠ **nextval はロールバックしても戻らない** → 番号に**欠番**が出る
- 複数のセッションが同時に nextval しても、**同じ値は返らない**

### serial 型

```sql
CREATE TABLE orders (id serial PRIMARY KEY, ...);
```

- 次の3つをまとめて行う略記: ① integer 列を作る ② シーケンス `orders_id_seq` を作る ③ 列の DEFAULT を `nextval('orders_id_seq')` にし、**NOT NULL** を付ける
- ⚠ serial だけでは **UNIQUE / PRIMARY KEY は付かない**（重複を防ぐには別途指定）
- ⚠ 値を**明示的に指定して INSERT できる**（シーケンスは進まない → 後で重複エラーの原因になる）
- 列（テーブル）を削除すると、シーケンスも削除される

### IDENTITY 列（SQL 標準）

```sql
id integer GENERATED ALWAYS AS IDENTITY       -- 明示的な値の指定を拒否
id integer GENERATED BY DEFAULT AS IDENTITY   -- 値を指定すればそれを使う
```

- **ALWAYS**: INSERT で値を指定すると**エラー**（`OVERRIDING SYSTEM VALUE` を付ければ指定できる）
- **BY DEFAULT**: 値を省略したときだけ自動採番（serial に近い）
- IDENTITY 列には自動で NOT NULL が付く

## 12. パーティショニング ★

```sql
CREATE TABLE sales (sold_on date, amount integer) PARTITION BY RANGE (sold_on);
CREATE TABLE sales_2026 PARTITION OF sales
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

- 大きなテーブルを、キーの値で複数の**子テーブル（パーティション）**に分ける（宣言的パーティショニング）
- 方式: **RANGE**（範囲）、**LIST**（値の列挙: `FOR VALUES IN ('東京', '大阪')`）、**HASH**（ハッシュ値で均等に分散）
- ⚠ RANGE の `FROM ... TO ...` は **FROM を含み、TO を含まない**
- 親テーブルに INSERT すると、適切なパーティションに自動で振り分けられる。行き先のパーティションがなければエラー（`DEFAULT` パーティションを作れば受け止められる）

### パーティションの付け外し（ATTACH / DETACH）

```sql
ALTER TABLE sales ATTACH PARTITION sales_2027
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');   -- 既存テーブルを子にする
ALTER TABLE sales DETACH PARTITION sales_2026;          -- 子を切り離す
```

- **ATTACH**: 作ってある普通のテーブルをパーティションとして組み込む。⚠ 範囲に合わない行があると**エラー**（組み込む前に全行を検査する）
- **DETACH**: パーティションを親から外す。⚠ 外したテーブルは**独立したテーブルとして残る**（データは消えない。消したいなら DROP TABLE）
- 古いデータの切り離し → 退避・削除が、DELETE より速く済む

## 13. 関数・プロシージャ・トリガー ★★

### ユーザー定義関数

```sql
CREATE FUNCTION tax_in(price integer) RETURNS integer AS $$
    SELECT (price * 1.1)::integer;
$$ LANGUAGE sql;

SELECT tax_in(100);   -- 110
```

- `CREATE [OR REPLACE] FUNCTION 名前(引数) RETURNS 戻り値の型 AS 本体 LANGUAGE 言語;`
- 本体は文字列。**ドル引用符 `$$ ... $$`** を使うと中の単一引用符をエスケープしなくてよい
- 言語: **sql**、**plpgsql**（変数・IF・ループが使える）、C など
- `RETURNS void`（返り値なし）、`RETURNS SETOF 型` / `RETURNS TABLE (...)`（複数行を返す）
- 同じ名前でも**引数の型・数が違えば別の関数**として作れる（オーバーロード）。削除時は `DROP FUNCTION tax_in(integer);` のように引数の型で区別する
- **プロシージャ**: `CREATE PROCEDURE` で作り **`CALL`** で実行。戻り値を持たず、**中で COMMIT / ROLLBACK できる**（関数はできない）

### PL/pgSQL の基本形

```sql
CREATE FUNCTION grade(score integer) RETURNS text AS $$
DECLARE
    result text;
BEGIN
    IF score >= 80 THEN
        result := 'A';
    ELSE
        result := 'B';
    END IF;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### トリガー

テーブルへの INSERT / UPDATE / DELETE（/ TRUNCATE）をきっかけに、関数を自動実行する。

```sql
CREATE FUNCTION set_updated() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_updated BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated();
```

- 手順: ① **戻り値の型が `trigger` の関数**を作る（引数なし）→ ② **CREATE TRIGGER** でテーブルに紐づける
- タイミング: **BEFORE**（実行前）/ **AFTER**（実行後）/ **INSTEAD OF**（ビューに対してのみ。代わりに実行）
- 単位: **FOR EACH ROW**（1行ごと）/ **FOR EACH STATEMENT**（1文に1回。**デフォルト**）
- 行トリガーでは **NEW**（新しい行。INSERT・UPDATE）と **OLD**（古い行。UPDATE・DELETE）を参照できる
- ⚠ BEFORE の行トリガーが **NULL を返すと、その行の操作は行われない**。NEW を書き換えて返すと、書き換えた値で保存される
- AFTER トリガーや文単位トリガーの戻り値は無視される
- `EXECUTE PROCEDURE` は古い書き方（意味は同じ）。`DROP TRIGGER trg_updated ON products;`
