"""
栖霞山石窟造像知识图谱数据生成器与服务模块 — 问窟 GrottoMind
将文献与考古调研中的实体（建筑、佛龛、颜料、历史、技术）组织为高阶知识图谱网络
支持前端关系图谱可视化与学术证据链检索
"""

from typing import List, Dict, Any

# 核心实体分类与样式映射
ENTITY_CATEGORIES = {
    "monument": {"label": "建筑与遗存", "color": "#f6cea0"},
    "sculpture": {"label": "造像与题材", "color": "#d4a96a"},
    "pigment": {"label": "矿物颜料", "color": "#c9372c"},
    "history": {"label": "历史与人物", "color": "#2e5c8a"},
    "science": {"label": "检测与科技", "color": "#4a7c59"}
}

# 结构化知识图谱节点与边定义
GRAPH_DATA: Dict[str, Any] = {
    "nodes": [
        # 1. 建筑与遗存
        {"id": "qixia_stupa", "name": "栖霞寺舍利塔", "category": "monument", "period": "隋始建 / 五代南唐重建", "val": 25, "desc": "八角五级密檐式石塔，通高约18米，南唐吴越王钱弘俶重建，五代佛教雕刻孤本。"},
        {"id": "thousand_buddha", "name": "千佛岩石窟群", "category": "monument", "period": "南齐—隋唐", "val": 22, "desc": "沿摄山崖壁绵延200米，有大小佛龛500余个，造像700余尊，南齐精品最为精湛。"},
        {"id": "qixia_temple", "name": "栖霞古寺", "category": "monument", "period": "南齐永明七年(489)", "val": 18, "desc": "明僧绍舍宅为寺，三论宗祖庭之一。"},
        {"id": "wuliangshou_niche", "name": "无量寿佛龛(大佛阁)", "category": "monument", "period": "南齐", "val": 16, "desc": "千佛岩最大石窟，高约10米，主尊阿弥陀佛坐像，背光极其繁复华丽。"},

        # 2. 造像与题材
        {"id": "flying_apsaras", "name": "舍利塔浮雕飞天", "category": "sculpture", "period": "五代南唐", "val": 20, "desc": "体态丰腴，帔帛舒展飘逸，面部沿袭唐风圆润，带有典型南唐顾闳中画风意趣。"},
        {"id": "eight_phases", "name": "须弥座释迦八相成道图", "category": "sculpture", "period": "五代南唐", "val": 19, "desc": "塔基须弥座浮雕八组连续叙事场景，刀法精微细腻，刀刀见笔。"},
        {"id": "four_guardians", "name": "塔身四大天王像", "category": "sculpture", "period": "五代南唐", "val": 15, "desc": "身披甲胄，脚踩夜叉，威武庄严，展现五代南方石雕铠甲细部雕刻巅峰。"},
        {"id": "puxian_bodhisattva", "name": "普贤菩萨乘象像", "category": "sculpture", "period": "五代", "val": 14, "desc": "六牙白象背负宝座，菩萨衣纹垂坠自然，六朝余韵流淌。"},

        # 3. 矿物颜料
        {"id": "cinnabar", "name": "朱砂 (HgS)", "category": "pigment", "period": "历代", "val": 18, "desc": "硫化汞矿物，中国传统红色核心颜料，用于天衣、佛唇与背光轮廓，色调庄严沉穆。"},
        {"id": "azurite", "name": "石青 (蓝铜矿)", "category": "pigment", "period": "六朝—唐宋", "val": 17, "desc": "碱式碳酸铜，天然矿物研磨，用于发髻、天衣外罩与冷调背景，历经风化色泽深邃。"},
        {"id": "malachite", "name": "石绿 (孔雀石)", "category": "pigment", "period": "六朝—唐宋", "val": 16, "desc": "碱式碳酸铜共生矿，用于飘带、莲瓣与草木意象，呈温润青绿色泽。"},
        {"id": "gold_leaf", "name": "泥金 / 金箔", "category": "pigment", "period": "六朝—隋唐", "val": 15, "desc": "佛像贴金与宝相勾勒，象征佛光普照与无量庄严。"},
        {"id": "ochre", "name": "赭石 (Fe2O3)", "category": "pigment", "period": "历代", "val": 12, "desc": "三氧化二铁天然矿物土，用于暗部打底与岩壁过渡。"},

        # 4. 历史与人物
        {"id": "mingshengshao", "name": "明僧绍", "category": "history", "period": "南朝齐", "val": 14, "desc": "南齐隐士居士，舍宅建寺，开启栖霞山千年佛教造像序幕。"},
        {"id": "qianhongchu", "name": "钱弘俶 (吴越王)", "category": "history", "period": "五代南唐", "val": 15, "desc": "崇奉佛教，出资重建栖霞寺五重石塔，融合吴越石雕与南唐画风。"},
        {"id": "hanxizai_painting", "name": "《韩熙载夜宴图》", "category": "history", "period": "南唐", "val": 14, "desc": "顾闳中绘，其人物设色（朱砂、石青、石绿）与舍利塔浮雕人物服饰审美高度同源。"},

        # 5. 检测与科技
        {"id": "xrf_spectroscopy", "name": "便携式 XRF 荧光光谱", "category": "science", "period": "现代科技", "val": 14, "desc": "无损无接触元素分析，准确测定 Hg(汞)、Cu(铜)、Fe(铁)、Pb(铅) 等微量颜料残留。"},
        {"id": "ai_recolor_engine", "name": "数字复彩生成推演", "category": "science", "period": "现代科技", "val": 16, "desc": "基于历史文献比对与光谱检测数据，运用多模态 AI 模型进行材质与色彩推演。"}
    ],
    "links": [
        {"source": "qixia_stupa", "target": "flying_apsaras", "relation": "雕刻于塔身"},
        {"source": "qixia_stupa", "target": "eight_phases", "relation": "雕刻于须弥座"},
        {"source": "qixia_stupa", "target": "four_guardians", "relation": "四方守护浮雕"},
        {"source": "qixia_stupa", "target": "qianhongchu", "relation": "主持重建"},
        {"source": "thousand_buddha", "target": "wuliangshou_niche", "relation": "主尊大窟"},
        {"source": "thousand_buddha", "target": "mingshengshao", "relation": "始凿渊源"},
        {"source": "qixia_temple", "target": "mingshengshao", "relation": "舍宅为寺"},
        {"source": "flying_apsaras", "target": "hanxizai_painting", "relation": "艺术设色风格同源"},
        {"source": "flying_apsaras", "target": "cinnabar", "relation": "推演天衣设色"},
        {"source": "flying_apsaras", "target": "azurite", "relation": "推演帔帛设色"},
        {"source": "flying_apsaras", "target": "gold_leaf", "relation": "头光金箔推演"},
        {"source": "puxian_bodhisattva", "target": "malachite", "relation": "莲座石绿设色"},
        {"source": "cinnabar", "target": "xrf_spectroscopy", "relation": "XRF 检出 Hg(汞) 元素"},
        {"source": "azurite", "target": "xrf_spectroscopy", "relation": "XRF 检出 Cu(铜) 元素"},
        {"source": "malachite", "target": "xrf_spectroscopy", "relation": "XRF 检出 Cu(铜) 元素"},
        {"source": "ai_recolor_engine", "target": "xrf_spectroscopy", "relation": "依据检测数据"},
        {"source": "ai_recolor_engine", "target": "hanxizai_painting", "relation": "参考同时代设色"}
    ]
}


def get_knowledge_graph() -> Dict[str, Any]:
    """获取完整的知识图谱网络数据"""
    return {
        "categories": ENTITY_CATEGORIES,
        "nodes": GRAPH_DATA["nodes"],
        "links": GRAPH_DATA["links"]
    }
