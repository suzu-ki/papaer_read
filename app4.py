from flask import Flask, render_template, request, jsonify
import os
import fitz  # PyMuPDF
import re

app = Flask(__name__, static_folder="static", template_folder="templates")

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

EXCLUDE_KEYWORDS = ["参考文献", "References", "REFERENCES"]
START_KEYWORDS = ["Abstract", "ABSTRACT", "アブスト", "あらまし", "概要"]


def is_heading(block):
    """行頭に番号付き（数字またはローマ数字）見出しがあるかを判定"""
    text = block["text"]#.strip()
    if not text:
        return False
    
    fontsize = block["fontsize"]
    # print(fontsize, text)
    if fontsize <= 10:
        return False

    # 「数字. 」で始まる場合（例: 1. Introduction）
    if re.match(r"^\s{0,3}\d+\.\s", text):
        return True
    
    if re.match(r"^\d\s{0,2}", text):
        return True

    # 「I.」〜「X.」などのローマ数字見出し（I〜Xに限定）
    if re.match(r"^\s{0,3}(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s", text):
        return True

    return False


@app.route("/")
def index():
    return render_template("index2.html")

def trim_before_abstract(text):
    """Abstract系キーワード以降のテキストを返す"""
    lower_text = text.lower()
    min_idx = len(text)
    for kw in START_KEYWORDS:
        idx = lower_text.find(kw.lower())
        if idx != -1 and idx < min_idx:
            min_idx = idx
    if min_idx < len(text):
        return text[min_idx:]
    return text  # キーワードがなければ全文返す

@app.route("/upload_old", methods=["POST"])
def upload_pdf_old():
    file = request.files.get("pdf")
    if not file:
        return jsonify({"error": "ファイルが選択されていません"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    sections = []
    current_section = {"title": "Intro", "text": ""}
    try:
        doc = fitz.open(filepath)
        skip_until_abstract = True  # 最初は Abstract までスキップ

        stop_processing = False
        for page in doc:
            if stop_processing:
                break
            blocks = page.get_text("dict")["blocks"]
            for b in blocks:
                print(b)
                if b["type"] != 0 or "lines" not in b:
                    continue
                for line in b["lines"]:
                    line_text = "".join([span["text"] for span in line["spans"]]).strip()
                    if stop_processing:
                        break
                    if not line_text:
                        continue
                    # 除外キーワードチェック
                    if any(kw in line_text for kw in EXCLUDE_KEYWORDS):
                        # continue
                        stop_processing = True
                        break

                    # Abstract系キーワード以前はスキップ
                    if skip_until_abstract:
                        if any(kw.lower() in line_text.lower() for kw in START_KEYWORDS):
                            skip_until_abstract = False
                            # Abstract キーワード自体もテキストに含める場合
                            line_text = trim_before_abstract(line_text)
                        else:
                            continue

                    # 見出し判定
                    fontsize = max([span["size"] for span in line["spans"]])
                    if is_heading({"text": line_text, "fontsize": fontsize}):
                        if current_section["text"]:
                            sections.append(current_section)
                        current_section = {"title": line_text, "text": ""}
                    else:
                        current_section["text"] += line_text #+ " "

        if current_section["text"]:
            sections.append(current_section)
        doc.close()
    except Exception as e:
        return jsonify({"error": f"PDF解析中にエラー: {str(e)}"}), 500
    finally:
        os.remove(filepath)

    if not sections:
        return jsonify({"error": "テキストを抽出できませんでした"}), 400

    return jsonify({"sections": sections})


def search_Abst(page1):
    skip_until_abstract = True
    blocks = page1.get_text("dict")["blocks"]
    for b in blocks:
        if b["type"] != 0 or "lines" not in b:
            continue
        for line in b["lines"]:
            line_text = "".join([span["text"] for span in line["spans"]]).strip()
            if not line_text:
                continue

            # Abstract系キーワード以前はスキップ
            if skip_until_abstract:
                if any(kw.lower() in line_text.lower() for kw in START_KEYWORDS):
                    skip_until_abstract = False
                    break
                else:
                    continue
    
    return skip_until_abstract

@app.route("/upload", methods=["POST"])
def upload_pdf():
    file = request.files.get("pdf")
    if not file:
        return jsonify({"error": "ファイルが選択されていません"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    sections = []
    current_section = {"title": "Intro", "text": ""}
    try:
        doc = fitz.open(filepath)
        skip_until_abstract = True  # 最初は Abstract までスキップ
        stop_processing = False
        
        abst_Flag = search_Abst(doc[0]) #アブストの有無をチェック：あり>>False
        
        for page in doc:
            if stop_processing:
                break
            blocks = page.get_text("dict")["blocks"]
            for b in blocks:
                if b["type"] != 0 or "lines" not in b:
                    continue
                for line in b["lines"]:
                    line_text = "".join([span["text"] for span in line["spans"]]).strip()
                    if stop_processing:
                        break
                    if not line_text:
                        continue
                    # 除外キーワードチェック
                    if any(kw in line_text for kw in EXCLUDE_KEYWORDS):
                        # continue
                        stop_processing = True
                        break
                    
                    if not abst_Flag:
                        # Abstract系キーワード以前はスキップ
                        if skip_until_abstract:
                            if any(kw.lower() in line_text.lower() for kw in START_KEYWORDS):
                                skip_until_abstract = False
                                # Abstract キーワード自体もテキストに含める場合
                                line_text = trim_before_abstract(line_text)
                            else:
                                continue

                    # 見出し判定
                    fontsize = max([span["size"] for span in line["spans"]])
                    if is_heading({"text": line_text, "fontsize": fontsize}):
                        if current_section["text"]:
                            sections.append(current_section)
                        current_section = {"title": line_text, "text": ""}
                    else:
                        if current_section["title"] == "Intro":
                            current_section["text"] += line_text
                        else:
                            if fontsize >= 9:
                                current_section["text"] += line_text

        if current_section["text"]:
            sections.append(current_section)
        doc.close()
    except Exception as e:
        return jsonify({"error": f"PDF解析中にエラー: {str(e)}"}), 500
    finally:
        os.remove(filepath)

    if not sections:
        return jsonify({"error": "テキストを抽出できませんでした"}), 400

    return jsonify({"sections": sections})


if __name__ == "__main__":
    app.run(debug=True)
