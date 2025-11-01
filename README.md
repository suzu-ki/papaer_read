## PDF読み上げアプリ（ローカル）

### 注意!!
> 本アプリはローカルで起動・利用することを前提としています
- 開発中です
- バグありです
- 使用の場合は自己責任でお願いします

#### 必要なアプリ
- VOICEVOX(開発時バージョン：0.24.2)

#### 立ち上げ
##### 初回：
```
python -m venv env
. env/bin/activate
pip install -r requirements.txt
```

##### 通常：
```
. env/bin/activate
```

##### 実行：
- VOICEVOXの起動
    - 音声を「VOICEVOX」に選択時必要
    - 「システム音声」も選択可能
- app4.pyの実行
```
python app4.py
```

- 「ファイルを選択」もしくはドラッグアンドドロップで任意の論文ファイルをアップロード
- 「PDFを読み込む」ボタン
- 聞きたい論文セクションを選択
- 「再生」


#### 開発環境
- Mac OS：Sonoma 14.5
- Google Chrome
- Apple Silicon M1 Pro
- Flask