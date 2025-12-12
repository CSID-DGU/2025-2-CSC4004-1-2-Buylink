"""
RAG 시스템 구축: 데이터셋의 예시를 활용한 검색 증강 생성
"""
import os
import json
import pickle
from typing import List, Dict
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from config import OPENAI_API_KEY, LABEL_PATH


class RAGBuilder:
    def __init__(self, vector_db_path="./chroma_db"):
        self.vector_db_path = vector_db_path
        self.embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
        self.vectorstore = None

    def build_knowledge_base(self, max_samples=1000):
        """데이터셋으로부터 지식 베이스 구축"""
        print("지식 베이스 구축 중...")

        documents = []
        count = 0

        for root, dirs, files in os.walk(LABEL_PATH):
            for file in files:
                if file.endswith('.json'):
                    try:
                        label_file = os.path.join(root, file)
                        with open(label_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)

                        if 'annotations' in data and len(data['annotations']) > 0:
                            ann = data['annotations'][0]
                            attrs = ann.get('attributes', {})

                            category = ""
                            if 'categories' in data and len(data['categories']) > 0:
                                category = data['categories'][0].get('name', '')

                            # 상세한 메타데이터로 문서 생성
                            product_name = attrs.get('product_name', '')
                            weight = attrs.get('weight', 0)
                            width = attrs.get('width', 0)
                            height = attrs.get('height', 0)
                            length = attrs.get('length', 0)
                            kan_code = attrs.get('KAN_code', '')

                            # 텍스트 설명 생성
                            text = f"""
제품명: {product_name}
카테고리: {category}
무게: {weight}g
크기(가로x세로x깊이): {width}cm x {height}cm x {length}cm
부피: {width * height * length}cm³
KAN 코드: {kan_code}

특징:
- 이 제품은 {category} 카테고리에 속합니다
- 무게는 약 {weight}g입니다
- 크기는 가로 {width}cm, 세로 {height}cm, 깊이 {length}cm입니다
- 총 부피는 약 {width * height * length}cm³입니다
"""

                            doc = Document(
                                page_content=text,
                                metadata={
                                    "category": category,
                                    "weight": weight,
                                    "width": width,
                                    "height": height,
                                    "length": length,
                                    "product_name": product_name,
                                    "kan_code": kan_code,
                                    "volume": width * height * length
                                }
                            )
                            documents.append(doc)
                            count += 1

                            if count >= max_samples:
                                break

                    except Exception as e:
                        continue

                if count >= max_samples:
                    break
            if count >= max_samples:
                break

        print(f"총 {len(documents)}개의 문서 생성 완료")

        # 벡터 스토어 생성
        print("벡터 스토어 생성 중...")
        self.vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.vector_db_path
        )
        print("벡터 스토어 생성 완료")

        return self.vectorstore

    def load_vectorstore(self):
        """기존 벡터 스토어 로드"""
        if os.path.exists(self.vector_db_path):
            print("기존 벡터 스토어 로드 중...")
            self.vectorstore = Chroma(
                persist_directory=self.vector_db_path,
                embedding_function=self.embeddings
            )
            print("벡터 스토어 로드 완료")
            return self.vectorstore
        else:
            print("벡터 스토어가 존재하지 않습니다. build_knowledge_base()를 먼저 실행하세요.")
            return None

    def search_similar_products(self, query: str, k: int = 5) -> List[Dict]:
        """유사한 제품 검색"""
        if self.vectorstore is None:
            self.load_vectorstore()

        if self.vectorstore is None:
            return []

        results = self.vectorstore.similarity_search_with_score(query, k=k)

        similar_products = []
        for doc, score in results:
            similar_products.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "similarity_score": score
            })

        return similar_products


if __name__ == "__main__":
    # 벡터 스토어 구축 (최초 1회만 실행)
    rag = RAGBuilder()

    # 기존 벡터 스토어가 있으면 로드, 없으면 생성
    if not os.path.exists("./chroma_db"):
        rag.build_knowledge_base(max_samples=500)  # 테스트용으로 500개만
    else:
        rag.load_vectorstore()

    # 테스트
    query = "가공식품 김치 무게 예측"
    results = rag.search_similar_products(query, k=3)

    print(f"\n'{query}' 검색 결과:")
    for i, result in enumerate(results):
        print(f"\n=== 결과 {i+1} (유사도: {result['similarity_score']:.4f}) ===")
        print(f"카테고리: {result['metadata']['category']}")
        print(f"제품명: {result['metadata']['product_name']}")
        print(f"무게: {result['metadata']['weight']}g")
        print(f"크기: {result['metadata']['width']}x{result['metadata']['height']}x{result['metadata']['length']}cm")
