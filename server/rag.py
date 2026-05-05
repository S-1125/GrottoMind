import os
import json
import chromadb
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KNOWLEDGE_DIR = os.path.join(SCRIPT_DIR, "knowledge")
CHROMA_DB_DIR = os.path.join(SCRIPT_DIR, "chroma_db")
COLLECTION_NAME = "qixia_literature"
# 当前使用的 Embedding 模型标识（用于检测模型变更）
EMBEDDING_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
MODEL_VERSION_FILE = os.path.join(CHROMA_DB_DIR, ".model_version")

# 初始化 ChromaDB 客户端
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

# 检查 Embedding 模型是否变更，如果变更则清除旧索引
def _check_model_version():
    """检测 Embedding 模型版本，如果与上次不同则清除旧向量索引"""
    os.makedirs(CHROMA_DB_DIR, exist_ok=True)
    if os.path.exists(MODEL_VERSION_FILE):
        with open(MODEL_VERSION_FILE, "r") as f:
            saved_model = f.read().strip()
        if saved_model == EMBEDDING_MODEL_NAME:
            return  # 模型未变更，跳过
        print(f"⚠️  Embedding 模型已从 '{saved_model}' 变更为 '{EMBEDDING_MODEL_NAME}'")
        print("   正在清除旧向量索引...")
        try:
            chroma_client.delete_collection(COLLECTION_NAME)
            print("   旧索引已清除，将在启动时自动重建。")
        except Exception:
            pass
    # 写入当前模型版本
    with open(MODEL_VERSION_FILE, "w") as f:
        f.write(EMBEDDING_MODEL_NAME)

_check_model_version()

# 获取或创建 collection
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"}
)

# 使用多语言嵌入模型（支持中文、英文等 50+ 语言）
print("Loading Multilingual Embedding Model...")
embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

# Initialize text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
    is_separator_regex=False,
)

def build_index():
    """Reads texts from knowledge dir, chunks them, and inserts them into ChromaDB."""
    meta_path = os.path.join(KNOWLEDGE_DIR, "metadata.json")
    if not os.path.exists(meta_path):
        print("metadata.json not found. Run notebooklm_sync.py first.")
        return

    with open(meta_path, "r", encoding="utf-8") as f:
        metadata_list = json.load(f)

    docs = []
    metadatas = []
    ids = []

    print(f"Indexing {len(metadata_list)} documents...")
    
    for meta in metadata_list:
        file_path = os.path.join(KNOWLEDGE_DIR, meta["filename"])
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()

        if not text.strip():
            continue

        # Split text into chunks
        chunks = text_splitter.split_text(text)
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{meta['id']}_chunk_{i}"
            docs.append(chunk)
            metadatas.append({
                "source_id": meta["id"],
                "title": meta["title"],
                "chunk_index": i
            })
            ids.append(chunk_id)

    if not docs:
        print("No documents found to index.")
        return

    print(f"Total chunks created: {len(docs)}")
    print("Computing embeddings and inserting into ChromaDB...")
    
    # We can add in batches to avoid memory issues
    batch_size = 100
    for i in range(0, len(docs), batch_size):
        batch_docs = docs[i:i+batch_size]
        batch_ids = ids[i:i+batch_size]
        batch_metadatas = metadatas[i:i+batch_size]
        
        # Generate embeddings
        embeddings = embedding_model.encode(batch_docs).tolist()
        
        collection.add(
            ids=batch_ids,
            embeddings=embeddings,
            metadatas=batch_metadatas,
            documents=batch_docs
        )
        print(f"Inserted batch {i//batch_size + 1}/{(len(docs)-1)//batch_size + 1}")
        
    print("Indexing complete.")

def search(query: str, top_k: int = 5, max_distance: float = 1.2):
    """搜索向量数据库，返回最相关的文本片段。
    
    Args:
        query: 用户查询文本
        top_k: 返回的最大结果数
        max_distance: 余弦距离阈值，超过此值的结果视为不相关并过滤掉
                      (cosine distance: 0 = 完全相同, 2 = 完全相反)
    """
    # 生成查询向量
    query_embedding = embedding_model.encode([query]).tolist()
    
    # 查询 ChromaDB（同时返回距离分数用于过滤）
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )
    
    # 格式化并过滤结果
    if not results["documents"] or not results["documents"][0]:
        return []
        
    formatted_results = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0]
    ):
        # 过滤掉相关度过低的结果（距离越大越不相关）
        if dist > max_distance:
            continue
        formatted_results.append({
            "text": doc,
            "title": meta["title"],
            "source_id": meta["source_id"],
            "distance": round(dist, 4)
        })
        
    return formatted_results

if __name__ == "__main__":
    # If run as script, build the index
    build_index()
