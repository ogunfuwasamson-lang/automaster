import { describe, expect, it } from "vitest";
import { cleanSchool } from "@/lib/match-rules";

describe("cleanSchool", () => {
  it("shows the university, not the faculty a programme was filed under", () => {
    expect(cleanSchool("Johns Hopkins University Carey Business School")).toBe("Johns Hopkins University");
    expect(cleanSchool("University of Cambridge, Cambridge Judge Business School")).toBe("University of Cambridge");
    expect(cleanSchool("Alliance Manchester Business School, University of Manchester")).toBe("University of Manchester");
    expect(cleanSchool("University of Leicester School of Business")).toBe("University of Leicester");
    expect(cleanSchool("Hong Kong University of Science and Technology (HKUST) Business School")).toBe("Hong Kong University of Science and Technology");
    expect(cleanSchool("Nanyang Technological University (NTU) Nanyang Business School")).toBe("Nanyang Technological University");
    expect(cleanSchool("University at Buffalo School of Management (SUNY)")).toBe("University at Buffalo");
    expect(cleanSchool("Boston College School of Social Work")).toBe("Boston College");
    expect(cleanSchool("Kyoto University, Graduate School of Agriculture")).toBe("Kyoto University");
    expect(cleanSchool("Universidade de São Paulo - Escola de Engenharia de São Carlos (EESC)")).toBe("Universidade de São Paulo");
    expect(cleanSchool("University College London (UCL), Institute of Education")).toBe("University College London");
    expect(cleanSchool("Imperial College London (Imperial College Business School)")).toBe("Imperial College London");
  });
  it("leaves standalone schools and campus names alone", () => {
    for (const n of ["London Business School", "London School of Economics and Political Science", "MIT Sloan School of Management", "Copenhagen Business School", "Tuck School of Business at Dartmouth", "University of California, Davis", "University of Maryland, College Park", "Technion – Israel Institute of Technology", "Teachers College, Columbia University", "The Chinese University of Hong Kong, Shenzhen"])
      expect(cleanSchool(n)).toBe(n);
  });
});
