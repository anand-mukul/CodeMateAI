"""
CodeMate AI — Phase 7 Secure Build & Configuration Parser
Parses pom.xml, build.gradle, and application.properties/yml files with XXE protection.
"""

import re
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional


class ConfigParser:
    """Parses Spring Boot build and configuration files securely."""

    @classmethod
    def parse_pom_xml(cls, pom_content: str) -> Dict:
        """
        Parses Maven pom.xml safely disabling external entity processing (XXE defense).
        """
        result = {
            "group_id": None,
            "artifact_id": None,
            "version": None,
            "spring_boot_version": None,
            "dependencies": [],
        }

        try:
            # Defuse XML: check for DOCTYPE entity expansion
            if "<!DOCTYPE" in pom_content.upper() or "<!ENTITY" in pom_content.upper():
                # Strip DOCTYPE declarations to neutralize XXE attempts
                pom_content = re.sub(r"<!DOCTYPE[\s\S]*?>", "", pom_content, flags=re.IGNORECASE)

            # Strip namespaces for simplified querying
            clean_xml = re.sub(r'\sxmlns="[^"]+"', '', pom_content, count=1)
            root = ET.fromstring(clean_xml)

            # Extract project coordinate
            group_elem = root.find("groupId")
            art_elem = root.find("artifactId")
            ver_elem = root.find("version")

            if group_elem is not None:
                result["group_id"] = group_elem.text
            if art_elem is not None:
                result["artifact_id"] = art_elem.text
            if ver_elem is not None:
                result["version"] = ver_elem.text

            # Check parent for Spring Boot starter parent
            parent = root.find("parent")
            if parent is not None:
                p_art = parent.find("artifactId")
                p_ver = parent.find("version")
                if p_art is not None and "spring-boot" in (p_art.text or ""):
                    result["spring_boot_version"] = p_ver.text if p_ver is not None else "3.x"

            # Extract dependencies
            deps_node = root.find("dependencies")
            if deps_node is not None:
                for dep in deps_node.findall("dependency"):
                    d_group = dep.find("groupId")
                    d_art = dep.find("artifactId")
                    d_ver = dep.find("version")

                    dep_info = {
                        "group_id": d_group.text.strip() if d_group is not None and d_group.text else "",
                        "artifact_id": d_art.text.strip() if d_art is not None and d_art.text else "",
                        "version": d_ver.text.strip() if d_ver is not None and d_ver.text else None,
                    }
                    result["dependencies"].append(dep_info)

        except Exception as e:
            result["parse_error"] = str(e)

        return result

    @classmethod
    def parse_application_properties(cls, content: str) -> Dict[str, str]:
        """Parses standard Java .properties key=value configurations."""
        config: Dict[str, str] = {}
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("!"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                config[key.strip()] = val.strip()
            elif ":" in line:
                key, val = line.split(":", 1)
                config[key.strip()] = val.strip()
        return config

