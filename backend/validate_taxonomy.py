import json

data = json.load(open(r'z:\Multi_Agent\talent-ai\backend\taxonomy.json', 'r', encoding='utf-8'))

checks = {
    'TensorFlow': ['Python', 'Deep Learning', 'Machine Learning', 'NumPy'],
    'PyTorch': ['Python', 'Deep Learning', 'Machine Learning', 'NumPy'],
    'React': ['JavaScript', 'HTML', 'CSS'],
    'Next.js': ['React', 'JavaScript', 'Node.js'],
    'Kubernetes': ['Docker', 'DevOps'],
    'FastAPI': ['Python', 'REST API design'],
    'Django': ['Python', 'REST API design'],
    'Spring Boot': ['Java', 'REST API design'],
    'React Native': ['React', 'JavaScript', 'Mobile Development'],
    'LangChain': ['Python', 'LLM Orchestration', 'Prompt Engineering'],
    'dbt': ['SQL', 'Data Warehousing'],
    'Apache Airflow': ['Python', 'ETL Pipelines'],
}

all_pass = True
for skill, expected in checks.items():
    actual = set(data[skill]['implies'])
    missing = set(expected) - actual
    if missing:
        print(f"FAIL {skill}: missing implies {missing}")
        all_pass = False
    else:
        print(f"PASS {skill}: {expected}")

if all_pass:
    print("\nAll key implies relationships verified!")
else:
    print("\nSome checks failed!")
