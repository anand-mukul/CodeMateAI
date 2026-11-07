"""
CodeMate AI — Deterministic Mock AI Provider
Provides high-fidelity offline simulated responses for local testing and CI/CD without API keys.
"""

from typing import Any, Dict, Optional, Type, TypeVar
from pydantic import BaseModel
from app.ai.provider import AIProvider
from app.schemas.analysis import ProblemAnalysis, ProblemExplanation, PotentialApproach
from app.schemas.solution import (
    SolutionResponse,
    ApproachDetail,
    ComplexityAnalysis,
    ComplexityItem,
    OptimizationResponse,
    SolutionFixResponse,
)

T = TypeVar("T", bound=BaseModel)


class MockAIProvider(AIProvider):
    """
    Mock LLM provider generating deterministic competitive programming responses.
    Clearly flags provider='mock' to ensure transparency.
    """

    def __init__(self, model_name: str = "mock-deterministic-v1"):
        self._model_name = model_name

    @property
    def provider_name(self) -> str:
        return "mock"

    @property
    def model_name(self) -> str:
        return self._model_name

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        prompt_lower = prompt.lower()
        if "complete only the single project file" in prompt_lower or "task: complete" in prompt_lower:
            import re
            match = re.search(r"file '([^']+)'", prompt)
            target_fname = match.group(1).lower() if match else ""
            sol = self._mock_solution_response(prompt_lower)
            if sol.workspace_files and target_fname:
                for wf in sol.workspace_files:
                    if wf.filename.lower() == target_fname:
                        return f"```java\n{wf.code}\n```"
            fname = match.group(1) if match else "Solution.java"
            cname = fname.split(".")[0]
            return f"```java\npublic class {cname} {{\n    // Completed implementation\n}}\n```"

        return (
            "[CodeMate AI Mock Provider] This is a simulated text response for development and offline testing. "
            "To connect a real LLM, configure AI_PROVIDER and AI_API_KEY in backend/.env."
        )

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
    ) -> T:
        prompt_lower = prompt.lower()

        # Route to appropriate mock generator based on requested schema
        if response_schema == ProblemAnalysis:
            return self._mock_problem_analysis(prompt_lower)  # type: ignore
        elif response_schema == ProblemExplanation:
            return self._mock_problem_explanation(prompt_lower)  # type: ignore
        elif response_schema == SolutionResponse:
            return self._mock_solution_response(prompt_lower)  # type: ignore
        elif response_schema == OptimizationResponse:
            return self._mock_optimization_response(prompt_lower)  # type: ignore
        elif response_schema == SolutionFixResponse:
            return self._mock_solution_fix_response(prompt_lower)  # type: ignore

        # Fallback for generic schema: instantiate with default/mock values
        raise NotImplementedError(f"Mock generator not implemented for schema {response_schema.__name__}")

    async def check_connection(self) -> Dict[str, Any]:
        return {
            "available": True,
            "provider": self.provider_name,
            "model": self.model_name,
            "is_mock": True,
            "message": "Mock provider active. Operates offline without external network or API key.",
        }

    def _mock_problem_analysis(self, prompt: str) -> ProblemAnalysis:
        is_mirror = "number mirror" in prompt or "mirror" in prompt
        is_add = "add two numbers" in prompt or "sum" in prompt or "flow001" in prompt

        if is_mirror:
            summary = "Echo the single input integer N directly to standard output."
            objective = "Read integer N and print it unchanged."
            rec_algo = "Direct Fast I/O Streaming"
            rec_ds = ["int variable"]
            t_comp = "O(1)"
            s_comp = "O(1)"
            edge_cases = ["N = 0 (boundary minimum)", "N = 10^5 (boundary maximum)"]
        elif is_add:
            summary = "Calculate the sum of two integers A and B for T independent test cases."
            objective = "Process T test cases, computing A + B for each."
            rec_algo = "Iterative Arithmetic Evaluation"
            rec_ds = ["primitive integer variables"]
            t_comp = "O(T)"
            s_comp = "O(1)"
            edge_cases = ["A = 0 or B = 0", "Large integer values within bounds"]
        else:
            summary = "Standard competitive programming algorithmic challenge."
            objective = "Process inputs and compute the mathematically optimal answer satisfying constraints."
            rec_algo = "Optimal Linear / Greedy Evaluation"
            rec_ds = ["std::vector", "hash table"]
            t_comp = "O(N)"
            s_comp = "O(1)"
            edge_cases = ["Minimum constraint boundary (N=1)", "Maximum constraint boundary (N=10^5)"]

        return ProblemAnalysis(
            problem_summary=summary,
            objective=objective,
            input_description="Standard input containing test cases and problem parameters formatted per specifications.",
            output_description="Required output formatted according to problem guidelines.",
            constraints_analysis="Constraints fit comfortably within standard 1.0 second CPU limits for optimal time complexity.",
            important_observations=[
                "Direct stream processing avoids unnecessary memory allocations.",
                "Input bounds guarantee standard 32-bit/64-bit integer ranges.",
            ],
            potential_approaches=[
                PotentialApproach(
                    name="Brute Force",
                    time_complexity="O(N^2)" if not is_mirror and not is_add else "O(1)",
                    space_complexity="O(N)" if not is_mirror and not is_add else "O(1)",
                    feasibility="Suboptimal for large inputs" if not is_mirror and not is_add else "Optimal",
                    description="Straightforward iteration or nested comparison.",
                ),
                PotentialApproach(
                    name="Optimized Direct Approach",
                    time_complexity=t_comp,
                    space_complexity=s_comp,
                    feasibility="Optimal and highly scalable",
                    description="Utilizes direct mathematical evaluation and fast I/O.",
                ),
            ],
            recommended_algorithm=rec_algo,
            recommended_data_structures=rec_ds,
            expected_time_complexity=t_comp,
            expected_space_complexity=s_comp,
            edge_cases=edge_cases,
        )

    def _mock_problem_explanation(self, prompt: str) -> ProblemExplanation:
        is_mirror = "number mirror" in prompt or "mirror" in prompt
        is_add = "add two numbers" in prompt or "flow001" in prompt
        is_bst = "createbst" in prompt.lower() or "bst" in prompt.lower()
        is_product = any(k in prompt.lower() for k in [
            "product catalog", "productcontroller", "get /api/products", "post /api/products", "product.java"
        ])
        is_spring = is_product or any(k in prompt.lower() for k in [
            "studentservice", "collegeapp", "student service", "springpreasy", "spring boot", "com.example.demo"
        ])

        workspace_files_map = None

        if is_product:
            lang = "java"
            summary = "Product Catalog REST API (CRUD): Spring Boot RestController with in-memory ArrayList."
            algo = "RESTful CRUD Routing & In-Memory Entity State Management"
            t_not = "O(N)"
            s_not = "O(N)"

            product_model_code = (
                "package com.example.demo;\n\n"
                "public class Product {\n"
                "    private int id;\n"
                "    private String name;\n"
                "    private double price;\n\n"
                "    public Product() {\n"
                "    }\n\n"
                "    public Product(int id, String name, double price) {\n"
                "        this.id = id;\n"
                "        this.name = name;\n"
                "        this.price = price;\n"
                "    }\n\n"
                "    public int getId() {\n"
                "        return id;\n"
                "    }\n\n"
                "    public void setId(int id) {\n"
                "        this.id = id;\n"
                "    }\n\n"
                "    public String getName() {\n"
                "        return name;\n"
                "    }\n\n"
                "    public void setName(String name) {\n"
                "        this.name = name;\n"
                "    }\n\n"
                "    public double getPrice() {\n"
                "        return price;\n"
                "    }\n\n"
                "    public void setPrice(double price) {\n"
                "        this.price = price;\n"
                "    }\n"
                "}\n"
            )

            product_controller_code = (
                "package com.example.demo;\n\n"
                "import org.springframework.http.HttpStatus;\n"
                "import org.springframework.http.ResponseEntity;\n"
                "import org.springframework.web.bind.annotation.*;\n\n"
                "import java.util.ArrayList;\n"
                "import java.util.List;\n\n"
                "@RestController\n"
                "@RequestMapping(\"/api/products\")\n"
                "public class ProductController {\n\n"
                "    private final List<Product> products = new ArrayList<>();\n\n"
                "    public ProductController() {\n"
                "        products.add(new Product(1, \"Laptop\", 55000));\n"
                "        products.add(new Product(2, \"Smartphone\", 25000));\n"
                "        products.add(new Product(3, \"Headphones\", 3000));\n"
                "    }\n\n"
                "    // GET /api/products\n"
                "    @GetMapping\n"
                "    public List<Product> getAllProducts() {\n"
                "        return products;\n"
                "    }\n\n"
                "    // GET /api/products/{id}\n"
                "    @GetMapping(\"/{id}\")\n"
                "    public ResponseEntity<?> getProductById(@PathVariable int id) {\n"
                "        for (Product product : products) {\n"
                "            if (product.getId() == id) {\n"
                "                return ResponseEntity.ok(product);\n"
                "            }\n"
                "        }\n"
                "        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(\"Product not found\");\n"
                "    }\n\n"
                "    // POST /api/products\n"
                "    @PostMapping\n"
                "    public ResponseEntity<Product> createProduct(@RequestBody Product product) {\n"
                "        if (product.getId() <= 0) {\n"
                "            int nextId = products.stream().mapToInt(Product::getId).max().orElse(0) + 1;\n"
                "            product.setId(nextId);\n"
                "        }\n"
                "        products.add(product);\n"
                "        return ResponseEntity.status(HttpStatus.CREATED).body(product);\n"
                "    }\n\n"
                "    // PUT /api/products/{id}\n"
                "    @PutMapping(\"/{id}\")\n"
                "    public ResponseEntity<?> updateProduct(@PathVariable int id, @RequestBody Product updatedProduct) {\n"
                "        for (Product product : products) {\n"
                "            if (product.getId() == id) {\n"
                "                product.setName(updatedProduct.getName());\n"
                "                product.setPrice(updatedProduct.getPrice());\n"
                "                return ResponseEntity.ok(product);\n"
                "            }\n"
                "        }\n"
                "        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(\"Product not found\");\n"
                "    }\n\n"
                "    // DELETE /api/products/{id}\n"
                "    @DeleteMapping(\"/{id}\")\n"
                "    public ResponseEntity<String> deleteProduct(@PathVariable int id) {\n"
                "        for (Product product : products) {\n"
                "            if (product.getId() == id) {\n"
                "                products.remove(product);\n"
                "                return ResponseEntity.ok(\"Product deleted successfully\");\n"
                "            }\n"
                "        }\n"
                "        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(\"Product not found\");\n"
                "    }\n"
                "}\n"
            )

            demo_app_code = (
                "package com.example.demo;\n\n"
                "import org.springframework.boot.SpringApplication;\n"
                "import org.springframework.boot.autoconfigure.SpringBootApplication;\n\n"
                "@SpringBootApplication\n"
                "public class DemoApplication {\n"
                "    public static void main(String[] args) {\n"
                "        SpringApplication.run(DemoApplication.class, args);\n"
                "    }\n"
                "}\n"
            )

            code = product_controller_code
            workspace_files_map = {
                "Product.java": product_model_code,
                "ProductController.java": product_controller_code,
                "DemoApplication.java": demo_app_code,
            }
        elif is_spring:
            lang = "java"
            summary = "Student Service College App: Spring Boot Dependency Injection & Service Bean."
            algo = "Spring Dependency Injection & Repository / Service Layer"
            t_not = "O(1)"
            s_not = "O(N)"
            
            student_service_code = (
                "package com.example.demo.service;\n\n"
                "import com.example.demo.model.Student;\n"
                "import org.springframework.stereotype.Service;\n\n"
                "import java.util.ArrayList;\n"
                "import java.util.List;\n"
                "import java.util.Optional;\n\n"
                "@Service\n"
                "public class StudentService {\n\n"
                "    private final List<Student> students = new ArrayList<>();\n\n"
                "    // TODO 1: Add at least 3 sample students to the list in the constructor\n"
                "    public StudentService() {\n"
                "        students.add(new Student(\"Arjun\", \"Computer Science\"));\n"
                "        students.add(new Student(\"Priya\", \"Information Technology\"));\n"
                "        students.add(new Student(\"Rahul\", \"Computer Science\"));\n"
                "        students.add(new Student(\"Sneha\", \"Electronics\"));\n"
                "    }\n\n"
                "    // TODO 2: Return all students\n"
                "    public List<Student> getAllStudents() {\n"
                "        return students;\n"
                "    }\n\n"
                "    // TODO 3: Find a student by name (ignore case). Return Optional.empty() if not found\n"
                "    public Optional<Student> getByName(String name) {\n"
                "        if (name == null) return Optional.empty();\n"
                "        return students.stream()\n"
                "                .filter(s -> s.getName().equalsIgnoreCase(name))\n"
                "                .findFirst();\n"
                "    }\n\n"
                "    // TODO 4: Return all students belonging to the given branch\n"
                "    public List<Student> getByBranch(String branch) {\n"
                "        if (branch == null) return new ArrayList<>();\n"
                "        return students.stream()\n"
                "                .filter(s -> s.getBranch().equalsIgnoreCase(branch))\n"
                "                .toList();\n"
                "    }\n"
                "}\n"
            )

            student_controller_code = (
                "package com.example.demo.controller;\n\n"
                "import com.example.demo.model.Student;\n"
                "import com.example.demo.service.StudentService;\n"
                "import org.springframework.http.ResponseEntity;\n"
                "import org.springframework.web.bind.annotation.GetMapping;\n"
                "import org.springframework.web.bind.annotation.PathVariable;\n"
                "import org.springframework.web.bind.annotation.RequestMapping;\n"
                "import org.springframework.web.bind.annotation.RestController;\n\n"
                "import java.util.List;\n\n"
                "@RestController\n"
                "@RequestMapping(\"/api/students\")\n"
                "public class StudentController {\n\n"
                "    private final StudentService studentService;\n\n"
                "    public StudentController(StudentService studentService) {\n"
                "        this.studentService = studentService;\n"
                "    }\n\n"
                "    // DONE (example): GET /api/students -> all students\n"
                "    @GetMapping\n"
                "    public List<Student> getAll() {\n"
                "        return studentService.getAllStudents();\n"
                "    }\n\n"
                "    // TODO 1: GET /api/students/{name}\n"
                "    // Return 200 with the matching student (ignore case), or 404 if not found.\n"
                "    // Hint: studentService.getAllStudents().stream().filter(...).findFirst()\n"
                "    @GetMapping(\"/{name}\")\n"
                "    public ResponseEntity<Student> getByName(@PathVariable String name) {\n"
                "        return studentService.getByName(name)\n"
                "                .map(ResponseEntity::ok)\n"
                "                .orElse(ResponseEntity.notFound().build());\n"
                "    }\n\n"
                "    // TODO 2: GET /api/students/branch/{branch}\n"
                "    @GetMapping(\"/branch/{branch}\")\n"
                "    public List<Student> getByBranch(@PathVariable String branch) {\n"
                "        return studentService.getByBranch(branch);\n"
                "    }\n"
                "}\n"
            )

            college_app_code = (
                "package com.example.demo;\n\n"
                "import com.example.demo.service.StudentService;\n"
                "import org.springframework.beans.factory.annotation.Autowired;\n"
                "import org.springframework.boot.CommandLineRunner;\n"
                "import org.springframework.stereotype.Component;\n\n"
                "@Component\n"
                "public class CollegeApp implements CommandLineRunner {\n\n"
                "    private final StudentService studentService;\n\n"
                "    @Autowired\n"
                "    public CollegeApp(StudentService studentService) {\n"
                "        this.studentService = studentService;\n"
                "    }\n\n"
                "    @Override\n"
                "    public void run(String... args) throws Exception {\n"
                "        System.out.println(\"College App Started. Registered Students:\");\n"
                "        studentService.getAllStudents().forEach(s -> System.out.println(s.getName() + \" - \" + s.getBranch()));\n"
                "    }\n"
                "}\n"
            )

            student_model_code = (
                "package com.example.demo.model;\n\n"
                "public class Student {\n"
                "    private String name;\n"
                "    private String branch;\n\n"
                "    public Student() {\n"
                "    }\n\n"
                "    public Student(String name, String branch) {\n"
                "        this.name = name;\n"
                "        this.branch = branch;\n"
                "    }\n\n"
                "    public String getName() {\n"
                "        return name;\n"
                "    }\n\n"
                "    public void setName(String name) {\n"
                "        this.name = name;\n"
                "    }\n\n"
                "    public String getBranch() {\n"
                "        return branch;\n"
                "    }\n\n"
                "    public void setBranch(String branch) {\n"
                "        this.branch = branch;\n"
                "    }\n"
                "}\n"
            )

            demo_app_code = (
                "package com.example.demo;\n\n"
                "import org.springframework.boot.SpringApplication;\n"
                "import org.springframework.boot.autoconfigure.SpringBootApplication;\n\n"
                "@SpringBootApplication\n"
                "public class DemoApplication {\n"
                "    public static void main(String[] args) {\n"
                "        SpringApplication.run(DemoApplication.class, args);\n"
                "    }\n"
                "}\n"
            )

            code = student_service_code
            workspace_files_map = {
                "StudentService.java": student_service_code,
                "CollegeApp.java": college_app_code,
                "Student.java": student_model_code,
                "DemoApplication.java": demo_app_code,
            }
        elif is_bst and "starter code" in prompt.lower():
            code = (
                "/*\nstruct Node {\n    int val;\n    Node *left;\n    Node *right;\n"
                "    Node(int val) : val(val), left(nullptr), right(nullptr) {}\n};\n*/\n\n"
                "class Solution {\n"
                "public:\n"
                "    Node* createBST(vector<int> &nums) {\n"
                "        return buildBST(nums, 0, (int)nums.size() - 1);\n"
                "    }\n"
                "private:\n"
                "    Node* buildBST(const vector<int>& nums, int low, int high) {\n"
                "        if (low > high) return nullptr;\n"
                "        int mid = low + (high - low) / 2;\n"
                "        Node* root = new Node(nums[mid]);\n"
                "        root->left = buildBST(nums, low, mid - 1);\n"
                "        root->right = buildBST(nums, mid + 1, high);\n"
                "        return root;\n"
                "    }\n"
                "};\n"
            )
            summary = "Height-Balanced BST from Sorted Array using Divide and Conquer."
            algo = "Divide and Conquer"
            t_not = "O(N)"
            s_not = "O(log N)"
        elif is_mirror:
            title = "Number Mirror"
            simple_summary = "You are given a single number. All you need to do is print that exact same number back out."
            what_is_asked = "Print the single input integer N to standard output."
            input_breakdown = "The input contains a single integer, N."
            output_breakdown = "Output the integer N on a single line."
            walkthrough = [
                "1. If input is 123, the program prints 123.",
                "2. If input is 0, the program prints 0.",
            ]
        elif is_add:
            title = "Add Two Numbers"
            simple_summary = "You are given multiple pairs of numbers. For each pair, compute their sum and print the result."
            what_is_asked = "For each of the T test cases, print the sum of A and B."
            input_breakdown = "Line 1: integer T (number of test cases). Next T lines: two integers A and B."
            output_breakdown = "For each testcase, print A + B on a new line."
            walkthrough = [
                "1. Read testcase count T = 3.",
                "2. For pair (1, 2), calculate 1 + 2 = 3.",
                "3. For pair (100, 200), calculate 100 + 200 = 300.",
                "4. For pair (10, 40), calculate 10 + 40 = 50.",
            ]
        else:
            title = "Competitive Programming Problem"
            simple_summary = "Understand the input parameters and compute the required output efficiently within time limits."
            what_is_asked = "Generate the optimal output matching all sample test cases."
            input_breakdown = "Input contains problem-specific formatted lines."
            output_breakdown = "Output the computed results per line."
            walkthrough = ["Trace through provided sample cases to verify understanding of the rules."]

        return ProblemExplanation(
            problem_title=title,
            simple_summary=simple_summary,
            what_is_asked=what_is_asked,
            input_breakdown=input_breakdown,
            output_breakdown=output_breakdown,
            example_walkthrough=walkthrough,
            key_observations=[
                "Ensure standard fast I/O is used to prevent time limit exceeded on large outputs.",
                "Check for 0 and boundary values.",
            ],
            edge_cases_to_consider=[
                "Boundary limits specified in constraints.",
                "Large numbers requiring 64-bit integer types (long long in C++, long in Java).",
            ],
        )

    def _mock_solution_response(self, prompt: str) -> SolutionResponse:
        import re
        from app.schemas.problem import normalize_language_str

        # Parse target language using regex
        lang = "cpp"
        match = re.search(r"target language:\s*([a-z0-9_\+]+)", prompt, re.IGNORECASE)
        if match:
            raw_lang = match.group(1).strip()
            try:
                lang = normalize_language_str(raw_lang).value
            except ValueError:
                lang = "cpp"

        is_mirror = "number mirror" in prompt or "mirror" in prompt
        is_add = "add two numbers" in prompt or "flow001" in prompt
        is_bst = "createbst" in prompt.lower() or "bst" in prompt.lower()
        is_product = any(k in prompt.lower() for k in [
            "product catalog", "productcontroller", "get /api/products", "post /api/products", "product.java"
        ])
        is_spring = is_product or any(k in prompt.lower() for k in [
            "studentservice", "collegeapp", "student service", "springpreasy", "spring boot", "com.example.demo"
        ])

        workspace_files_map = None

        if is_product:
            lang = "java"
            summary = "Product Catalog REST API (CRUD): Spring Boot RestController with in-memory ArrayList."
            algo = "RESTful CRUD Routing & In-Memory Entity State Management"
            t_not = "O(N)"
            s_not = "O(N)"

            product_model_code = (
                "package com.example.demo;\n\n"
                "public class Product {\n"
                "    private int id;\n"
                "    private String name;\n"
                "    private double price;\n\n"
                "    public Product() {\n"
                "    }\n\n"
                "    public Product(int id, String name, double price) {\n"
                "        this.id = id;\n"
                "        this.name = name;\n"
                "        this.price = price;\n"
                "    }\n\n"
                "    public int getId() {\n"
                "        return id;\n"
                "    }\n\n"
                "    public void setId(int id) {\n"
                "        this.id = id;\n"
                "    }\n\n"
                "    public String getName() {\n"
                "        return name;\n"
                "    }\n\n"
                "    public void setName(String name) {\n"
                "        this.name = name;\n"
                "    }\n\n"
                "    public double getPrice() {\n"
                "        return price;\n"
                "    }\n\n"
                "    public void setPrice(double price) {\n"
                "        this.price = price;\n"
                "    }\n"
                "}\n"
            )

            product_controller_code = (
                "package com.example.demo;\n\n"
                "import org.springframework.http.HttpStatus;\n"
                "import org.springframework.http.ResponseEntity;\n"
                "import org.springframework.web.bind.annotation.*;\n\n"
                "import java.util.ArrayList;\n"
                "import java.util.List;\n\n"
                "@RestController\n"
                "@RequestMapping(\"/api/products\")\n"
                "public class ProductController {\n\n"
                "    private final List<Product> products = new ArrayList<>();\n\n"
                "    public ProductController() {\n"
                "        products.add(new Product(1, \"Laptop\", 55000));\n"
                "        products.add(new Product(2, \"Smartphone\", 25000));\n"
                "        products.add(new Product(3, \"Headphones\", 3000));\n"
                "    }\n\n"
                "    // GET /api/products\n"
                "    @GetMapping\n"
                "    public List<Product> getAllProducts() {\n"
                "        return products;\n"
                "    }\n\n"
                "    // GET /api/products/{id}\n"
                "    @GetMapping(\"/{id}\")\n"
                "    public ResponseEntity<?> getProductById(@PathVariable int id) {\n"
                "        for (Product product : products) {\n"
                "            if (product.getId() == id) {\n"
                "                return ResponseEntity.ok(product);\n"
                "            }\n"
                "        }\n"
                "        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(\"Product not found\");\n"
                "    }\n\n"
                "    // POST /api/products\n"
                "    @PostMapping\n"
                "    public ResponseEntity<Product> createProduct(@RequestBody Product product) {\n"
                "        if (product.getId() <= 0) {\n"
                "            int nextId = products.stream().mapToInt(Product::getId).max().orElse(0) + 1;\n"
                "            product.setId(nextId);\n"
                "        }\n"
                "        products.add(product);\n"
                "        return ResponseEntity.status(HttpStatus.CREATED).body(product);\n"
                "    }\n\n"
                "    // PUT /api/products/{id}\n"
                "    @PutMapping(\"/{id}\")\n"
                "    public ResponseEntity<?> updateProduct(@PathVariable int id, @RequestBody Product updatedProduct) {\n"
                "        for (Product product : products) {\n"
                "            if (product.getId() == id) {\n"
                "                product.setName(updatedProduct.getName());\n"
                "                product.setPrice(updatedProduct.getPrice());\n"
                "                return ResponseEntity.ok(product);\n"
                "            }\n"
                "        }\n"
                "        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(\"Product not found\");\n"
                "    }\n\n"
                "    // DELETE /api/products/{id}\n"
                "    @DeleteMapping(\"/{id}\")\n"
                "    public ResponseEntity<String> deleteProduct(@PathVariable int id) {\n"
                "        for (Product product : products) {\n"
                "            if (product.getId() == id) {\n"
                "                products.remove(product);\n"
                "                return ResponseEntity.ok(\"Product deleted successfully\");\n"
                "            }\n"
                "        }\n"
                "        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(\"Product not found\");\n"
                "    }\n"
                "}\n"
            )

            demo_app_code = (
                "package com.example.demo;\n\n"
                "import org.springframework.boot.SpringApplication;\n"
                "import org.springframework.boot.autoconfigure.SpringBootApplication;\n\n"
                "@SpringBootApplication\n"
                "public class DemoApplication {\n"
                "    public static void main(String[] args) {\n"
                "        SpringApplication.run(DemoApplication.class, args);\n"
                "    }\n"
                "}\n"
            )

            code = product_controller_code
            workspace_files_map = {
                "Product.java": product_model_code,
                "ProductController.java": product_controller_code,
                "DemoApplication.java": demo_app_code,
            }
        elif is_spring:
            lang = "java"
            summary = "Student Service College App: Spring Boot Dependency Injection & Service Bean."
            algo = "Spring Dependency Injection & Repository / Service Layer"
            t_not = "O(1)"
            s_not = "O(N)"
            
            student_service_code = (
                "package com.example.demo.service;\n\n"
                "import com.example.demo.model.Student;\n"
                "import org.springframework.stereotype.Service;\n\n"
                "import java.util.ArrayList;\n"
                "import java.util.List;\n"
                "import java.util.Optional;\n\n"
                "@Service\n"
                "public class StudentService {\n\n"
                "    private final List<Student> students = new ArrayList<>();\n\n"
                "    // TODO 1: Add at least 3 sample students to the list in the constructor\n"
                "    public StudentService() {\n"
                "        students.add(new Student(\"Arjun\", \"Computer Science\"));\n"
                "        students.add(new Student(\"Priya\", \"Information Technology\"));\n"
                "        students.add(new Student(\"Rahul\", \"Computer Science\"));\n"
                "        students.add(new Student(\"Sneha\", \"Electronics\"));\n"
                "    }\n\n"
                "    // TODO 2: Return all students\n"
                "    public List<Student> getAllStudents() {\n"
                "        return students;\n"
                "    }\n\n"
                "    // TODO 3: Find a student by name (ignore case). Return Optional.empty() if not found\n"
                "    public Optional<Student> getByName(String name) {\n"
                "        if (name == null) return Optional.empty();\n"
                "        return students.stream()\n"
                "                .filter(s -> s.getName().equalsIgnoreCase(name))\n"
                "                .findFirst();\n"
                "    }\n\n"
                "    // TODO 4: Return all students belonging to the given branch\n"
                "    public List<Student> getByBranch(String branch) {\n"
                "        if (branch == null) return new ArrayList<>();\n"
                "        return students.stream()\n"
                "                .filter(s -> s.getBranch().equalsIgnoreCase(branch))\n"
                "                .toList();\n"
                "    }\n"
                "}\n"
            )

            student_controller_code = (
                "package com.example.demo.controller;\n\n"
                "import com.example.demo.model.Student;\n"
                "import com.example.demo.service.StudentService;\n"
                "import org.springframework.http.ResponseEntity;\n"
                "import org.springframework.web.bind.annotation.GetMapping;\n"
                "import org.springframework.web.bind.annotation.PathVariable;\n"
                "import org.springframework.web.bind.annotation.RequestMapping;\n"
                "import org.springframework.web.bind.annotation.RestController;\n\n"
                "import java.util.List;\n\n"
                "@RestController\n"
                "@RequestMapping(\"/api/students\")\n"
                "public class StudentController {\n\n"
                "    private final StudentService studentService;\n\n"
                "    public StudentController(StudentService studentService) {\n"
                "        this.studentService = studentService;\n"
                "    }\n\n"
                "    // DONE (example): GET /api/students -> all students\n"
                "    @GetMapping\n"
                "    public List<Student> getAll() {\n"
                "        return studentService.getAllStudents();\n"
                "    }\n\n"
                "    // TODO 1: GET /api/students/{name}\n"
                "    // Return 200 with the matching student (ignore case), or 404 if not found.\n"
                "    // Hint: studentService.getAllStudents().stream().filter(...).findFirst()\n"
                "    @GetMapping(\"/{name}\")\n"
                "    public ResponseEntity<Student> getByName(@PathVariable String name) {\n"
                "        return studentService.getByName(name)\n"
                "                .map(ResponseEntity::ok)\n"
                "                .orElse(ResponseEntity.notFound().build());\n"
                "    }\n\n"
                "    // TODO 2: GET /api/students/branch/{branch}\n"
                "    @GetMapping(\"/branch/{branch}\")\n"
                "    public List<Student> getByBranch(@PathVariable String branch) {\n"
                "        return studentService.getByBranch(branch);\n"
                "    }\n"
                "}\n"
            )

            college_app_code = (
                "package com.example.demo;\n\n"
                "import com.example.demo.service.StudentService;\n"
                "import org.springframework.beans.factory.annotation.Autowired;\n"
                "import org.springframework.boot.CommandLineRunner;\n"
                "import org.springframework.stereotype.Component;\n\n"
                "@Component\n"
                "public class CollegeApp implements CommandLineRunner {\n\n"
                "    private final StudentService studentService;\n\n"
                "    @Autowired\n"
                "    public CollegeApp(StudentService studentService) {\n"
                "        this.studentService = studentService;\n"
                "    }\n\n"
                "    @Override\n"
                "    public void run(String... args) throws Exception {\n"
                "        System.out.println(\"College App Started. Registered Students:\");\n"
                "        studentService.getAllStudents().forEach(s -> System.out.println(s.getName() + \" - \" + s.getBranch()));\n"
                "    }\n"
                "}\n"
            )

            student_model_code = (
                "package com.example.demo.model;\n\n"
                "public class Student {\n"
                "    private String name;\n"
                "    private String branch;\n\n"
                "    public Student() {\n"
                "    }\n\n"
                "    public Student(String name, String branch) {\n"
                "        this.name = name;\n"
                "        this.branch = branch;\n"
                "    }\n\n"
                "    public String getName() {\n"
                "        return name;\n"
                "    }\n\n"
                "    public void setName(String name) {\n"
                "        this.name = name;\n"
                "    }\n\n"
                "    public String getBranch() {\n"
                "        return branch;\n"
                "    }\n\n"
                "    public void setBranch(String branch) {\n"
                "        this.branch = branch;\n"
                "    }\n"
                "}\n"
            )

            demo_app_code = (
                "package com.example.demo;\n\n"
                "import org.springframework.boot.SpringApplication;\n"
                "import org.springframework.boot.autoconfigure.SpringBootApplication;\n\n"
                "@SpringBootApplication\n"
                "public class DemoApplication {\n"
                "    public static void main(String[] args) {\n"
                "        SpringApplication.run(DemoApplication.class, args);\n"
                "    }\n"
                "}\n"
            )

            code = student_service_code
            workspace_files_map = {
                "StudentService.java": student_service_code,
                "CollegeApp.java": college_app_code,
                "Student.java": student_model_code,
                "DemoApplication.java": demo_app_code,
            }
        elif is_bst and "starter code" in prompt.lower():
            code = (
                "/*\nstruct Node {\n    int val;\n    Node *left;\n    Node *right;\n"
                "    Node(int val) : val(val), left(nullptr), right(nullptr) {}\n};\n*/\n\n"
                "class Solution {\n"
                "public:\n"
                "    Node* createBST(vector<int> &nums) {\n"
                "        return buildBST(nums, 0, (int)nums.size() - 1);\n"
                "    }\n"
                "private:\n"
                "    Node* buildBST(const vector<int>& nums, int low, int high) {\n"
                "        if (low > high) return nullptr;\n"
                "        int mid = low + (high - low) / 2;\n"
                "        Node* root = new Node(nums[mid]);\n"
                "        root->left = buildBST(nums, low, mid - 1);\n"
                "        root->right = buildBST(nums, mid + 1, high);\n"
                "        return root;\n"
                "    }\n"
                "};\n"
            )
            summary = "Height-Balanced BST from Sorted Array using Divide and Conquer."
            algo = "Divide and Conquer"
            t_not = "O(N)"
            s_not = "O(log N)"
        elif is_mirror:
            code = self._get_mirror_code(lang)
            summary = "Number Mirror: Direct input/output echoing."
            algo = "Fast I/O Streaming"
            t_not = "O(1)"
            s_not = "O(1)"
        elif is_add:
            code = self._get_add_code(lang)
            summary = "Add Two Numbers: T test cases arithmetic summation."
            algo = "Loop Iteration & Fast Addition"
            t_not = "O(T)"
            s_not = "O(1)"
        else:
            code = self._get_generic_code(lang)
            summary = "Optimal algorithmic solution satisfying constraints."
            algo = "Greedy & Linear Traversal"
            t_not = "O(N)"
            s_not = "O(1)"

        return SolutionResponse(
            success=True,
            problem_summary=summary,
            approach=ApproachDetail(
                name=f"Optimal {algo}",
                explanation=f"Processes input directly via stream I/O and computes result with minimal overhead.",
                steps=[
                    "Configure fast input/output buffers for high throughput.",
                    "Parse incoming tokens per problem specification.",
                    "Execute the core logic and emit the computed result.",
                ],
            ),
            algorithm=algo,
            data_structures=["Primitive scalar variables"],
            code=code,
            workspace_files=workspace_files_map,
            language=lang,
            complexity=ComplexityAnalysis(
                time=ComplexityItem(notation=t_not, explanation="Each input element is processed in constant time."),
                space=ComplexityItem(notation=s_not, explanation="No auxiliary data structures or memory buffers."),
            ),
            edge_cases=["Minimum and maximum constraint limits handled cleanly."],
            sample_case_analysis=["Verified against sample input with matching output."],
            warnings=[],
            provider=self.provider_name,
            model=self.model_name,
        )

    def _mock_optimization_response(self, prompt: str) -> OptimizationResponse:
        improved_code = (
            "#include <iostream>\n"
            "using namespace std;\n\n"
            "int main() {\n"
            "    // Optimized with Fast I/O and zero-allocation streaming\n"
            "    ios_base::sync_with_stdio(false);\n"
            "    cin.tie(NULL);\n\n"
            "    int n;\n"
            "    if (cin >> n) {\n"
            "        cout << n << \"\\n\";\n"
            "    }\n"
            "    return 0;\n"
            "}\n"
        )
        return OptimizationResponse(
            success=True,
            improved_code=improved_code,
            language="cpp",
            explanation_of_changes="Replaced slow unbuffered I/O with synchronized fast streaming (`cin.tie(NULL)`). "
                                   "Eliminated unnecessary dynamic allocations to reduce cache pressure.",
            original_complexity=ComplexityAnalysis(
                time=ComplexityItem(notation="O(N)", explanation="Unbuffered standard I/O with high overhead."),
                space=ComplexityItem(notation="O(N)", explanation="Excess memory from unneeded vector storage."),
            ),
            optimized_complexity=ComplexityAnalysis(
                time=ComplexityItem(notation="O(1)", explanation="Direct constant time evaluation."),
                space=ComplexityItem(notation="O(1)", explanation="Zero auxiliary memory overhead."),
            ),
            bottlenecks_eliminated=["Unsynchronized stream flushing", "Redundant intermediate container allocation"],
            tradeoffs=["Code structure is streamlined specifically for competitive programming."],
            provider=self.provider_name,
            model=self.model_name,
        )

    def _get_mirror_code(self, lang: str) -> str:
        if lang == "cpp":
            return (
                "#include <iostream>\n"
                "#include <vector>\n"
                "using namespace std;\n\n"
                "typedef long long ll;\n\n"
                "int main() {\n"
                "    ios_base::sync_with_stdio(false);\n"
                "    cin.tie(NULL);\n\n"
                "    int n;\n"
                "    if (cin >> n) {\n"
                "        cout << n << \"\\n\";\n"
                "    }\n"
                "    return 0;\n"
                "}\n"
            )
        elif lang == "python":
            return (
                "import sys\n\n"
                "def solve():\n"
                "    input_data = sys.stdin.read().split()\n"
                "    if input_data:\n"
                "        print(input_data[0])\n\n"
                "if __name__ == '__main__':\n"
                "    solve()\n"
            )
        elif lang == "java":
            return (
                "import java.io.BufferedReader;\n"
                "import java.io.InputStreamReader;\n"
                "import java.io.IOException;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) throws IOException {\n"
                "        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));\n"
                "        String line = reader.readLine();\n"
                "        if (line != null && !line.trim().isEmpty()) {\n"
                "            System.out.println(line.trim());\n"
                "        }\n"
                "    }\n"
                "}\n"
            )
        elif lang == "c":
            return (
                "#include <stdio.h>\n\n"
                "int main(void) {\n"
                "    int n;\n"
                "    if (scanf(\"%d\", &n) == 1) {\n"
                "        printf(\"%d\\n\", n);\n"
                "    }\n"
                "    return 0;\n"
                "}\n"
            )
        elif lang == "javascript":
            return (
                "const fs = require('fs');\n\n"
                "function main() {\n"
                "    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n"
                "    if (input.length > 0 && input[0] !== '') {\n"
                "        console.log(input[0]);\n"
                "    }\n"
                "}\n\n"
                "main();\n"
            )
        elif lang == "go":
            return (
                "package main\n\n"
                "import (\n"
                "    \"bufio\"\n"
                "    \"fmt\"\n"
                "    \"os\"\n"
                ")\n\n"
                "func main() {\n"
                "    reader := bufio.NewReader(os.Stdin)\n"
                "    var n int\n"
                "    if _, err := fmt.Fscan(reader, &n); err == nil {\n"
                "        fmt.Println(n)\n"
                "    }\n"
                "}\n"
            )
        return self._get_mirror_code("cpp")

    def _get_add_code(self, lang: str) -> str:
        if lang == "cpp":
            return (
                "#include <iostream>\n"
                "using namespace std;\n\n"
                "int main() {\n"
                "    ios_base::sync_with_stdio(false);\n"
                "    cin.tie(NULL);\n\n"
                "    int t;\n"
                "    if (cin >> t) {\n"
                "        while (t--) {\n"
                "            int a, b;\n"
                "            cin >> a >> b;\n"
                "            cout << (a + b) << \"\\n\";\n"
                "        }\n"
                "    }\n"
                "    return 0;\n"
                "}\n"
            )
        elif lang == "python":
            return (
                "import sys\n\n"
                "def solve():\n"
                "    input_data = sys.stdin.read().split()\n"
                "    if not input_data:\n"
                "        return\n"
                "    t = int(input_data[0])\n"
                "    idx = 1\n"
                "    out = []\n"
                "    for _ in range(t):\n"
                "        a = int(input_data[idx])\n"
                "        b = int(input_data[idx + 1])\n"
                "        out.append(str(a + b))\n"
                "        idx += 2\n"
                "    print('\\n'.join(out))\n\n"
                "if __name__ == '__main__':\n"
                "    solve()\n"
            )
        elif lang == "java":
            return (
                "import java.io.BufferedReader;\n"
                "import java.io.InputStreamReader;\n"
                "import java.io.IOException;\n"
                "import java.util.StringTokenizer;\n\n"
                "public class Main {\n"
                "    public static void main(String[] args) throws IOException {\n"
                "        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));\n"
                "        String line = reader.readLine();\n"
                "        if (line == null) return;\n"
                "        int t = Integer.parseInt(line.trim());\n"
                "        StringBuilder sb = new StringBuilder();\n"
                "        for (int i = 0; i < t; i++) {\n"
                "            StringTokenizer st = new StringTokenizer(reader.readLine());\n"
                "            int a = Integer.parseInt(st.nextToken());\n"
                "            int b = Integer.parseInt(st.nextToken());\n"
                "            sb.append(a + b).append('\\n');\n"
                "        }\n"
                "        System.out.print(sb);\n"
                "    }\n"
                "}\n"
            )
        elif lang == "c":
            return (
                "#include <stdio.h>\n\n"
                "int main(void) {\n"
                "    int t;\n"
                "    if (scanf(\"%d\", &t) == 1) {\n"
                "        while (t--) {\n"
                "            int a, b;\n"
                "            scanf(\"%d %d\", &a, &b);\n"
                "            printf(\"%d\\n\", a + b);\n"
                "        }\n"
                "    }\n"
                "    return 0;\n"
                "}\n"
            )
        elif lang == "javascript":
            return (
                "const fs = require('fs');\n\n"
                "function main() {\n"
                "    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n"
                "    if (!tokens || tokens.length === 0 || tokens[0] === '') return;\n"
                "    const t = parseInt(tokens[0], 10);\n"
                "    let idx = 1;\n"
                "    for (let i = 0; i < t; i++) {\n"
                "        const a = parseInt(tokens[idx++], 10);\n"
                "        const b = parseInt(tokens[idx++], 10);\n"
                "        console.log(a + b);\n"
                "    }\n"
                "}\n\n"
                "main();\n"
            )
        elif lang == "go":
            return (
                "package main\n\n"
                "import (\n"
                "    \"bufio\"\n"
                "    \"fmt\"\n"
                "    \"os\"\n"
                ")\n\n"
                "func main() {\n"
                "    reader := bufio.NewReader(os.Stdin)\n"
                "    writer := bufio.NewWriter(os.Stdout)\n"
                "    defer writer.Flush()\n\n"
                "    var t int\n"
                "    if _, err := fmt.Fscan(reader, &t); err == nil {\n"
                "        for i := 0; i < t; i++ {\n"
                "            var a, b int\n"
                "            fmt.Fscan(reader, &a, &b)\n"
                "            fmt.Fprintln(writer, a+b)\n"
                "        }\n"
                "    }\n"
                "}\n"
            )
        return self._get_add_code("cpp")

    def _get_generic_code(self, lang: str) -> str:
        if lang == "python":
            return (
                "import sys\n\n"
                "def solve():\n"
                "    input_data = sys.stdin.read().split()\n"
                "    if not input_data:\n"
                "        return\n"
                "    # Process inputs linearly\n"
                "    print(input_data[0])\n\n"
                "if __name__ == '__main__':\n"
                "    solve()\n"
            )
        return (
            "#include <iostream>\n"
            "#include <vector>\n"
            "using namespace std;\n\n"
            "typedef long long ll;\n\n"
            "int main() {\n"
            "    ios_base::sync_with_stdio(false);\n"
            "    cin.tie(NULL);\n\n"
            "    int n;\n"
            "    if (cin >> n) {\n"
            "        cout << n << \"\\n\";\n"
            "    }\n"
            "    return 0;\n"
            "}\n"
        )

    def _mock_solution_fix_response(self, prompt: str) -> SolutionFixResponse:
        is_cpp = "language: cpp" in prompt or "c++" in prompt
        is_python = "language: python" in prompt

        if is_cpp:
            fixed_code = (
                "#include <iostream>\n"
                "#include <vector>\n"
                "using namespace std;\n\n"
                "typedef long long ll;\n\n"
                "int main() {\n"
                "    ios_base::sync_with_stdio(false);\n"
                "    cin.tie(NULL);\n\n"
                "    ll a, b;\n"
                "    if (cin >> a >> b) {\n"
                "        cout << (a + b) << \"\\n\";\n"
                "    }\n"
                "    return 0;\n"
                "}\n"
            )
        elif is_python:
            fixed_code = (
                "import sys\n\n"
                "def solve():\n"
                "    tokens = sys.stdin.read().split()\n"
                "    if len(tokens) >= 2:\n"
                "        print(int(tokens[0]) + int(tokens[1]))\n\n"
                "if __name__ == '__main__':\n"
                "    solve()\n"
            )
        else:
            fixed_code = (
                "#include <iostream>\n"
                "using namespace std;\n"
                "int main() {\n"
                "    int x; cin >> x;\n"
                "    cout << x << endl;\n"
                "    return 0;\n"
                "}\n"
            )

        is_compile_err = "compilation" in prompt or "syntax" in prompt or "undefined" in prompt
        return SolutionFixResponse(
            success=True,
            fixed_code=fixed_code,
            language="cpp" if is_cpp else ("python" if is_python else "cpp"),
            error_category="COMPILATION_ERROR" if is_compile_err else "LOGICAL_ERROR",
            explanation="The code failed due to missing standard headers or type mismatch in the input reader.",
            changes_made=[
                "Added required headers and namespace declaration",
                "Fixed type precision to prevent integer overflow",
                "Wrapped I/O in conditional checks to avoid reading beyond EOF",
            ],
            potential_side_effects=[
                "Ensure standard input stream is formatted cleanly with whitespace-delimited tokens"
            ],
            confidence="HIGH",
            provider=self.provider_name,
            model=self.model_name,
        )
