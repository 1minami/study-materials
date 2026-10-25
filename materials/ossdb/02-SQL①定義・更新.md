# SQL① 定義・更新

> S3.1 SQL コマンド（重要度13）の前半。データ型・テーブル定義（DDL）・制約・データの追加/更新/削除（DML）。「どの操作がエラーになるか」「NULL はどう扱われるか」が定番。

## 1. データ型 ★★★

### 数値型

| 型 | サイズ | 範囲・特徴 |
|---|---|---|
| **smallint**（int2） | 2バイト | -32768 〜 32767 |
| **integer**（int / int4） | 4バイト | 約 ±21億。整数の標準 |
| **bigint**（int8） | 8バイト | 約 ±922京 |
| **numeric(p, s)**（decimal） | 可変 | **精度 p（全体の桁数）・位取り s（小数点以下の桁数）**を指定する**正確な**数値。金額向き |
| **real**（float4） | 4バイト | 単精度浮動小数点（有効桁 約6桁）。**誤差がある** |
| **double precision**（float8） | 8バイト | 倍精度浮動小数点（有効桁 約15桁）。**誤差がある** |
| **smallserial / serial / bigserial** | 2 / 4 / 8バイト | 自動採番（実体は整数型＋シーケンス。→ 03章） |

- `numeric(5, 2)` は**全体5桁・小数2桁** → 最大 999.99
  - 小数部が s を超える値（123.456）は**丸められて**入る（123.46）
  - 整数部が収まらない値（1234.5）は **エラー**（numeric field overflow）
- `numeric` を精度なしで書くと、上限内で任意の桁数を持てる
- integer 列に 1.5 を入れると**四捨五入**されて 2 になる（エラーではない）

### 文字列型

| 型 | 特徴 |
|---|---|
| **char(n)**（character） | **固定長**。n 文字に満たない分は**空白で埋める**。`char` だけなら `char(1)` |
| **varchar(n)**（character varying） | **可変長**。最大 n 文字。`varchar` だけなら長さ無制限 |
| **text** | 可変長・**長さ無制限**。PostgreSQL ではよく使う |

- n は**バイト数ではなく文字数**
- ⚠ n を超える文字列を入れると **エラー**（value too long）。ただし超えた部分が**すべて空白なら切り詰めて**入る
- ⚠ `CAST('abcdef' AS varchar(3))` のように**明示的にキャスト**すると、エラーにならず**切り詰め**られる（'abc'）
- 性能は char・varchar・text でほぼ同じ（char が速いわけではない）

### 日付・時刻型

| 型 | 内容 |
|---|---|
| **date** | 日付のみ |
| **time** | 時刻のみ（タイムゾーンなし） |
| **timestamp** | 日付＋時刻（**タイムゾーンなし**） |
| **timestamptz**（timestamp with time zone） | 日付＋時刻（**タイムゾーンあり**）。内部では UTC で保存し、表示時に `timezone` 設定に合わせて変換する |
| **interval** | 時間の**間隔**（'1 day'、'3 hours' など） |

- ⚠ `timestamp` だけなら **without time zone**（タイムゾーンなし）
- 入力例: `'2026-10-19'`、`'2026-10-19 09:30:00'`。特別な値 `'now'`、`'today'`、`'tomorrow'`、`'infinity'` も使える

### その他の型

| 型 | 内容 |
|---|---|
| **boolean** | `true` / `false` / NULL の3値。入力は `'t'`・`'yes'`・`'on'`・`'1'` なども真と解釈される |
| **bytea** | バイナリデータ |
| **json / jsonb** | JSON。json はテキストのまま保存、**jsonb は分解したバイナリ形式**で保存（検索が速く、インデックスを作れる） |
| 配列 | `integer[]`、`text[]` のように型の後ろに `[]`。添字は **1 始まり** |
| uuid、inet / cidr、money など | |

## 2. テーブルの作成（CREATE TABLE）★★★

```sql
CREATE TABLE products (
    id      integer PRIMARY KEY,
    name    varchar(50) NOT NULL,
    price   integer DEFAULT 0 CHECK (price >= 0),
    cat_id  integer REFERENCES categories (id)
);
```

- 列ごとに「列名 データ型 [列制約]」をカンマ区切りで並べる
- `CREATE TABLE IF NOT EXISTS t ...`: 既に存在してもエラーにせず**何もしない**（NOTICE を出す）
- 識別子は引用符なしなら**小文字**に変換される（`CREATE TABLE Products` → `products`）

### 既存のデータ・定義から作る

| 書き方 | 作られるもの |
|---|---|
| `CREATE TABLE t2 AS SELECT * FROM t1;` | 検索結果の**列とデータ**をコピー |
| `SELECT * INTO t2 FROM t1;` | 上と同じ（PostgreSQL 独自の書き方） |
| `CREATE TABLE t2 AS SELECT * FROM t1 WITH NO DATA;` | 列定義だけ（データなし） |
| `CREATE TABLE t2 (LIKE t1);` | 列定義と **NOT NULL 制約**だけ。`INCLUDING ALL` でデフォルト・CHECK 制約・インデックスなども複製 |

- ⚠ `CREATE TABLE AS` / `SELECT INTO` では、**制約（NOT NULL・主キーも含む）・デフォルト値・インデックスは一切コピーされない**

### 一時テーブル

- `CREATE TEMPORARY TABLE t (...)`（`TEMP` でも可）
- 作成した**セッションの中だけ**で見え、**セッション終了時に自動で削除**される
- `ON COMMIT DROP`（コミット時に削除）、`ON COMMIT DELETE ROWS`（コミット時に全行削除）も指定できる

## 3. 制約 ★★★

| 制約 | 内容 | NULL の扱い |
|---|---|---|
| **NOT NULL** | NULL を禁止 | — |
| **UNIQUE** | 値の重複を禁止 | ⚠ **NULL は何個でも入る**（NULL 同士は等しくないと扱う） |
| **PRIMARY KEY** | **UNIQUE ＋ NOT NULL**。1テーブルに**1つだけ** | 入らない |
| **CHECK (条件)** | 条件を満たさない値を禁止 | ⚠ 条件が **NULL（UNKNOWN）なら通る**（偽のときだけ拒否） |
| **FOREIGN KEY** / **REFERENCES** | 参照先テーブルに存在する値だけ許可 | NULL は入る |
| **DEFAULT 値** | 値を省略したときに入る値（厳密には制約ではない） | 省略時のデフォルトは NULL |

- **PRIMARY KEY・UNIQUE を付けると、自動で一意インデックスが作られる**
- ⚠ 外部キー（参照する側の列）には**インデックスは自動で作られない**
- 外部キーの参照先は**主キーか UNIQUE 制約のある列**でなければならない

### 列制約と表制約

```sql
CREATE TABLE order_items (
    order_id   integer,
    product_id integer,
    qty        integer NOT NULL,
    PRIMARY KEY (order_id, product_id),                 -- 複合主キー（表制約）
    FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT qty_positive CHECK (qty > 0)             -- 制約に名前を付ける
);
```

- **列制約**: 列定義の後ろに書く。その列だけが対象
- **表制約**: 列定義と並べて書く。**複数列にまたがる制約**（複合主キーなど）はこちらでしか書けない
- ⚠ **NOT NULL は列制約としてしか書けない**
- `CONSTRAINT 名前` で制約に名前を付けられる（省略すると自動で付く。削除するときに使う）

### 外部キーの参照動作

参照先（親）の行を削除・更新したとき、参照元（子）をどうするか。

| 指定 | 動作 |
|---|---|
| **NO ACTION**（**デフォルト**） | 参照されている行は削除・更新できない（エラー）。チェックは文の最後に行う |
| **RESTRICT** | NO ACTION と同じくエラー。チェックを即座に行う（遅延できない） |
| **CASCADE** | 子の行も**一緒に削除**（更新なら子の値も更新） |
| **SET NULL** | 子の列を **NULL** にする |
| **SET DEFAULT** | 子の列を**デフォルト値**にする |

```sql
cat_id integer REFERENCES categories (id) ON DELETE CASCADE ON UPDATE CASCADE
```

### ドメイン（CREATE DOMAIN）

データ型に制約・デフォルト値を付けて名前を付けたもの（ユーザー定義型の一種）。同じ制約を多くの列で使い回せる。

```sql
CREATE DOMAIN price_t AS integer
    DEFAULT 0
    NOT NULL
    CHECK (VALUE >= 0);                    -- VALUE は検査対象の値

CREATE TABLE products (
    id    integer PRIMARY KEY,
    price price_t                           -- データ型の代わりに使う
);
```

- 付けられるのは **NOT NULL / NULL・CHECK・DEFAULT** だけ
- ⚠ **UNIQUE・PRIMARY KEY・FOREIGN KEY はドメインに付けられない**（列・表の制約として書く）
- CHECK の中では、検査する値を **VALUE** で表す（列名は書かない）
- 列に DEFAULT を書くと、**列の DEFAULT がドメインの DEFAULT より優先**される
- ⚠ ドメインの制約は列側で**外せない**（列側で制約を追加するのはできる）
- 変更は **ALTER DOMAIN**（`SET DEFAULT` / `DROP DEFAULT`・`SET NOT NULL` / `DROP NOT NULL`・`ADD CONSTRAINT` / `DROP CONSTRAINT`・`RENAME TO`）。制約を追加すると**既存データも検査**され、違反があればエラー
- `DROP DOMAIN d;` ⚠ 使っている列があると**エラー**。**`CASCADE` ならその列も削除**される
- psql の一覧表示は **`\dD`**

## 4. テーブル定義の変更（ALTER TABLE）★★★

| 操作 | 構文 |
|---|---|
| 列の追加 | `ALTER TABLE t ADD COLUMN c integer;`（`COLUMN` は省略可） |
| 列の削除 | `ALTER TABLE t DROP COLUMN c;` |
| 列名の変更 | `ALTER TABLE t RENAME COLUMN c TO c2;` |
| テーブル名の変更 | `ALTER TABLE t RENAME TO t2;` |
| データ型の変更 | `ALTER TABLE t ALTER COLUMN c TYPE bigint;`（自動変換できないときは `USING 式`） |
| デフォルト値 | `ALTER TABLE t ALTER COLUMN c SET DEFAULT 0;` / `DROP DEFAULT` |
| NOT NULL | `ALTER TABLE t ALTER COLUMN c SET NOT NULL;` / `DROP NOT NULL` |
| 制約の追加 | `ALTER TABLE t ADD CONSTRAINT 名前 UNIQUE (c);` |
| 制約の削除 | `ALTER TABLE t DROP CONSTRAINT 名前;` |

- 追加した列の既存行の値は、DEFAULT 指定があれば**その値**、なければ **NULL**
- ⚠ NULL を含む列に `SET NOT NULL` すると**エラー**。既存データが制約に違反する `ADD CONSTRAINT` も同様
- ⚠ 列名変更は `RENAME COLUMN`、型変更は `ALTER COLUMN ... TYPE`。`MODIFY`（Oracle / MySQL の構文）は**使えない**
- カンマで区切れば1文で複数の変更ができる（`ALTER TABLE t ADD COLUMN a int, ADD COLUMN b int;`）

## 5. テーブルの削除（DROP / TRUNCATE）★★

### DROP TABLE

- `DROP TABLE t;` テーブルの**定義ごと**削除。複数をカンマで並べられる
- `DROP TABLE IF EXISTS t;` 存在しなくてもエラーにしない
- **RESTRICT**（デフォルト）: 依存するオブジェクト（ビュー・外部キー）があれば**エラー**
- **CASCADE**: 依存するオブジェクトも削除
- ⚠ CASCADE で消えるのは**ビュー**や、参照元テーブルの**外部キー制約**。参照元の**テーブル自体は消えない**

### TRUNCATE

- `TRUNCATE t;` テーブルの**全行を高速に削除**（定義は残る）
- `DELETE`（WHERE なし）との違い

| | DELETE | TRUNCATE |
|---|---|---|
| WHERE で行を絞る | できる | **できない**（常に全行） |
| 速度 | 行ごとに処理（遅い） | テーブルのファイルを作り直す（**速い**） |
| 領域 | 不要行が残る → VACUUM で回収 | **即座に解放** |
| ON DELETE トリガー | 実行される | **実行されない** |
| ロールバック | できる | **できる**（PostgreSQL では TRUNCATE もトランザクション内で取り消せる） |

- `RESTART IDENTITY`: 列に紐づくシーケンスを初期値に戻す（デフォルトは `CONTINUE IDENTITY` で戻さない）
- ⚠ 外部キーで**参照されているテーブル**は、`CASCADE` を付けるか参照元も同時に指定しないと TRUNCATE できない（参照元が空でもエラー）

## 6. データの追加（INSERT）★★★

```sql
INSERT INTO products (id, name, price) VALUES (1, 'りんご', 120);
INSERT INTO products VALUES (2, 'みかん', 80, NULL);              -- 列名省略: 全列を定義順に
INSERT INTO products (id, name) VALUES (3, 'ぶどう'), (4, 'もも');  -- 複数行を一度に
INSERT INTO products (id, name, price) VALUES (5, 'なし', DEFAULT); -- デフォルト値を明示
INSERT INTO products_bak SELECT * FROM products WHERE price > 100;  -- 検索結果を追加
INSERT INTO logs DEFAULT VALUES;                                     -- 全列デフォルト値
```

- 列リストで**省略した列にはデフォルト値**（なければ NULL）が入る
- 列名を省略すると定義順に先頭から当てはめる。値の数が列数より少なければ、残りの列はデフォルト値
- ⚠ `INSERT ... SELECT` に **VALUES は付けない**

### RETURNING

- 追加・更新・削除した行の値を**その場で返す**（INSERT / UPDATE / DELETE で使える）
- `INSERT INTO products (name) VALUES ('かき') RETURNING id;` → 自動採番された id を取得

### ON CONFLICT（UPSERT）

一意制約に違反したときの動作を指定する。

```sql
INSERT INTO products (id, name, price) VALUES (1, 'りんご', 150)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price;   -- あれば更新、なければ追加

INSERT INTO products (id, name) VALUES (1, 'りんご')
ON CONFLICT DO NOTHING;                                   -- あれば何もしない
```

- **`EXCLUDED`** は「追加しようとして衝突した行」を指す
- ⚠ `DO UPDATE` では衝突対象（`(id)` や `ON CONSTRAINT 制約名`）の指定が**必須**。`DO NOTHING` は省略できる

## 7. データの更新・削除（UPDATE / DELETE）★★★

```sql
UPDATE products SET price = price * 1.1, name = 'ふじ' WHERE id = 1;
DELETE FROM products WHERE price IS NULL;
```

- ⚠ **WHERE を省略すると全行が対象**（エラーにも警告にもならない）
- SET の右辺はすべて**更新前の値**で計算される（`SET a = b, b = a` で値が入れ替わる）
- 該当行が0件でもエラーにならない（`UPDATE 0` / `DELETE 0` と表示）
- 制約に違反する更新・削除は**文全体がエラー**になり、1行も変わらない

### 他のテーブルを参照して更新・削除

```sql
-- UPDATE は FROM
UPDATE products p SET price = s.price
FROM sale_prices s WHERE p.id = s.product_id;

-- DELETE は USING
DELETE FROM products p USING discontinued d WHERE p.id = d.product_id;

-- サブクエリでも書ける
DELETE FROM products WHERE id IN (SELECT product_id FROM discontinued);
```

- ⚠ 結合に使う句は **UPDATE → `FROM`**、**DELETE → `USING`**（逆にしない）
