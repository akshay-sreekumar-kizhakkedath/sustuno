import json, csv, re, hashlib
from pathlib import Path
ROOT = Path(r"D:\SUSTUNO\AI Training dataset")
OUT = ROOT / "master_knowledge_base.json"
records = []
cid = [0]
def nid(prefix):
    cid[0]+=1
    return f"{prefix}-{cid[0]:05d}"
def blank_app(**kw):
    d={"fiber":[],"dye_class":[],"fabric":[],"chemical":[],"machine_type":[],"process_stage":[],"shade":[]}
    for k,v in kw.items():
        if k in d: d[k]=v
    return d
def blank_rel(): return {"source_parameter":None,"target_parameter":None,"direction":"unknown","description":None}
def blank_form(): return {"expression":None,"variables":[]}
def rec(knowledge_id,domain,knowledge_type,subject,prop,value,minimum,maximum,unit,conditions,applicability,relationship,formula,source,confidence,validation_status,notes):
    records.append({"knowledge_id":knowledge_id,"domain":domain,"knowledge_type":knowledge_type,"subject":subject,"property":prop,"value":value,"minimum":minimum,"maximum":maximum,"unit":unit,"conditions":conditions,"applicability":applicability,"relationship":relationship,"formula":formula,"source":source,"confidence":confidence,"validation_status":validation_status,"notes":notes})
def src(file_name,file_type,excerpt,section=None,table=None,row=None,column=None,page=None):
    return {"file_name":file_name,"file_type":file_type,"page":page,"section":section,"table":table,"row":row,"column":column,"excerpt":excerpt[:1200]}
def parse_range(s):
    if not s: return None,None
    m=re.findall(r"[-+]?\d*\.?\d+",str(s))
    if len(m)>=2:
        try: return float(m[0]),float(m[1])
        except: return None,None
    return None,None
def first_num(s):
    m=re.search(r"[-+]?\d*\.?\d+",str(s))
    return float(m.group()) if m else None

# ---------- 1. Standard recipes ----------
f = ROOT/"textile pro"/"Standard Recipes"/"Standard_Recipes_Master_Dataset.json"
if f.exists():
    data=json.loads(f.read_text(encoding="utf-8"))
    for r in data:
        bi=r.get("basic_information",{}); di=r.get("dye_information",{}); pp=r.get("process_parameters",{}); mr=r.get("machine_requirement",{}); ps=r.get("process_steps",{}); qp=r.get("quality_parameters",{}); ref=r.get("references",{})
        rid=bi.get("recipe_id",""); rname=bi.get("recipe_name","")
        app=blank_app(fiber=[bi.get("fabric_type","")],dye_class=[di.get("dye_type","")],fabric=[bi.get("fabric_type","")],shade=[bi.get("shade_name","")])
        rec(nid("KB"),"recipe","recipe",rid,"recipe name",rname,None,None,None,[],app,blank_rel(),blank_form(),src(f.name,"other",json.dumps(bi)[:800],section="basic_information"),"high","pending",None)
        # dye concentration
        rec(nid("KB"),"dyeing","fact",di.get("dye_name",""),"dye concentration",di.get("dye_concentration"),None,None,"% owf" if "owf" in str(di.get("dye_concentration","")) else None,[{"parameter":"recipe_id","operator":"==","value":rid}],app,blank_rel(),blank_form(),src(f.name,"other",json.dumps(di)[:800],section="dye_information"),"high","pending",None)
        for ch in r.get("chemical_information",[]):
            mn,mx=parse_range(ch.get("dosage",""))
            unit="g/L" if "g/L" in ch.get("dosage","") else ("% owf" if "owf" in ch.get("dosage","") else None)
            capp=blank_app(fiber=[bi.get("fabric_type","")],dye_class=[di.get("dye_type","")],chemical=[ch.get("chemical_name","")],shade=[bi.get("shade_name","")])
            rec(nid("KB"),"recipe","recipe",ch.get("chemical_name",""),"dosage in "+rid,ch.get("dosage"),mn,mx,unit,[{"parameter":"recipe_id","operator":"==","value":rid}],capp,blank_rel(),blank_form(),src(f.name,"other",json.dumps(ch)[:800],section="chemical_information"),"high","pending",ch.get("addition_sequence"))
            rec(nid("KB"),"chemical","compatibility",ch.get("chemical_name",""),"compatibility",ch.get("compatibility"),None,None,None,[{"parameter":"recipe_id","operator":"==","value":rid}],capp,blank_rel(),blank_form(),src(f.name,"other",str(ch.get("compatibility",""))[:500],section="chemical_information"),"high","pending",None)
            rec(nid("KB"),"chemical","exception",ch.get("chemical_name",""),"incompatible chemicals",ch.get("incompatible_chemicals"),None,None,None,[{"parameter":"recipe_id","operator":"==","value":rid}],capp,blank_rel(),blank_form(),src(f.name,"other",str(ch.get("incompatible_chemicals",""))[:500],section="chemical_information"),"high","pending",None)
        # process params
        lr=pp.get("liquor_ratio","")
        rec(nid("KB"),"dyeing","process_step",rid,"liquor ratio",lr,None,None,None,[],app,blank_rel(),blank_form(),src(f.name,"other",lr,section="process_parameters"),"high","pending",pp.get("temperature_profile"))
        for k in ["heating_rate","cooling_rate","time","ph","temperature_profile","pressure"]:
            if pp.get(k):
                rec(nid("KB"),"dyeing","fact",rid,k,pp.get(k),None,None,None,[],app,blank_rel(),blank_form(),src(f.name,"other",str(pp.get(k))[:600],section="process_parameters"),"high","pending",None)
        for k,v in ps.items():
            rec(nid("KB"),"dyeing","process_step",rid,k,v,None,None,None,[],app,blank_rel(),blank_form(),src(f.name,"other",str(v)[:600],section="process_steps"),"high","pending",None)
        rec(nid("KB"),"machine","constraint",mr.get("recommended_machine",mr.get("machine_type","")),"rated capacity for "+rid,mr.get("machine_capacity"),first_num(str(mr.get("machine_capacity",""))),first_num(str(mr.get("machine_capacity",""))),"kg",[],blank_app(machine_type=[mr.get("machine_type","")]),blank_rel(),blank_form(),src(f.name,"other",json.dumps(mr)[:600],section="machine_requirement"),"high","pending",None)
        for k,v in qp.items():
            rec(nid("KB"),"dyeing","experimental_result",rid,k,v,None,None,None,[],app,blank_rel(),blank_form(),src(f.name,"other",str(v)[:500],section="quality_parameters"),"medium","pending",None)
        if ref.get("notes"):
            rec(nid("KB"),"wastewater","fact","input water for "+rid,"TDS and hardness limit",ref.get("notes"),None,None,"ppm",[],app,blank_rel(),blank_form(),src(f.name,"other",ref.get("notes"),section="references"),"medium","pending",None)

# ---------- 2. Machine constraints master ----------
f2 = ROOT/"textile pro"/"Machine Constraints"/"Machine_Constraints_Master_Rules.json"
if f2.exists():
    data=json.loads(f2.read_text(encoding="utf-8"))
    for m in data:
        md=m.get("machine_details",{}); name=md.get("machine_name","")+ " ("+md.get("model","")+")"
        app=blank_app(machine_type=[md.get("machine_type","")])
        cap=m.get("capacity",{}); ol=m.get("operating_limits",{}); mc=m.get("machine_constraints",{}); perf=m.get("performance",{}); ai=m.get("ai_constraints",{})
        rec(nid("KB"),"machine","constraint",name,"maximum batch size",cap.get("maximum_batch_size"),first_num(str(cap.get("maximum_batch_size",""))),first_num(str(cap.get("maximum_batch_size",""))),"kg",[],app,blank_rel(),blank_form(),src(f2.name,"other",str(cap.get("maximum_batch_size","")),section="capacity"),"high","pending",None)
        rec(nid("KB"),"machine","constraint",name,"minimum batch size",cap.get("minimum_batch_size"),first_num(str(cap.get("minimum_batch_size",""))),first_num(str(cap.get("minimum_batch_size",""))),"kg",[],app,blank_rel(),blank_form(),src(f2.name,"other",str(cap.get("minimum_batch_size","")),section="capacity"),"high","pending",None)
        rec(nid("KB"),"machine","range",name,"liquor capacity",cap.get("liquor_capacity"),*parse_range(str(cap.get("liquor_capacity",""))),"L",[],app,blank_rel(),blank_form(),src(f2.name,"other",str(cap.get("liquor_capacity","")),section="capacity"),"high","pending",None)
        rec(nid("KB"),"machine","range",name,"maximum temperature",ol.get("maximum_temperature"),first_num(str(ol.get("maximum_temperature",""))),first_num(str(ol.get("maximum_temperature",""))),"°C",[],app,blank_rel(),blank_form(),src(f2.name,"other",str(ol.get("maximum_temperature","")),section="operating_limits"),"high","pending",None)
        rec(nid("KB"),"machine","range",name,"maximum pressure",ol.get("maximum_pressure"),first_num(str(ol.get("maximum_pressure",""))),first_num(str(ol.get("maximum_pressure",""))),"bar",[],app,blank_rel(),blank_form(),src(f2.name,"other",str(ol.get("maximum_pressure","")),section="operating_limits"),"high","pending",None)
        for k in ["heating_rate","cooling_rate","maximum_speed"]:
            if ol.get(k): rec(nid("KB"),"machine","range",name,k,ol.get(k),*parse_range(str(ol.get(k))),"°C/min" if "rate" in k else None,[],app,blank_rel(),blank_form(),src(f2.name,"other",str(ol.get(k))[:400],section="operating_limits"),"high","pending",None)
        for k,v in mc.items():
            rec(nid("KB"),"machine","constraint",name,k,v,None,None,None,[],app,blank_rel(),blank_form(),src(f2.name,"other",str(v)[:600],section="machine_constraints"),"high","pending",None)
        for k,v in perf.items():
            rec(nid("KB"),"machine","fact",name,k,v,*parse_range(str(v)),None,[],app,blank_rel(),blank_form(),src(f2.name,"other",str(v)[:500],section="performance"),"medium","pending",None)
        for eq in ai.get("constraint_equations",[]):
            rec(nid("KB"),"machine","formula",name,"constraint equation",eq,None,None,None,[],app,blank_rel(),{"expression":eq,"variables":[]},src(f2.name,"other",eq,section="ai_constraints.constraint_equations"),"medium","pending",None)
        for r_ in ai.get("machine_operating_rules",[])+ai.get("decision_rules",[])+ai.get("interlock_conditions",[])+ai.get("best_operating_practices",[]):
            rec(nid("KB"),"machine","constraint",name,"operating rule",r_,None,None,None,[],app,blank_rel(),blank_form(),src(f2.name,"other",r_,section="ai_constraints"),"medium","pending",None)

# ---------- 3. Quick reference CSV ----------
f3 = ROOT/"textile pro"/"Machine Constraints"/"Dyeing_Parameters_Quick_Reference.csv"
if f3.exists():
    rows=list(csv.DictReader(f3.read_text(encoding="utf-8").splitlines()))
    for i,r in enumerate(rows,1):
        app=blank_app(fiber=[r.get("Fiber Type","")],dye_class=[r.get("Dye Class","")],machine_type=[r.get("Machine Type","")])
        for col in ["Liquor Ratio (MLR)","Temp Range (°C)","Max Pressure (bar)","Heating Rate (°C/min)","Critical Chemicals & Dosage","Target pH","Key Machine & Process Constraints"]:
            v=r.get(col,"")
            if v: rec(nid("KB"),"dyeing","fact",r.get("Fiber Type","")+" / "+r.get("Dye Class",""),col,v,*parse_range(v),None,[{"parameter":"machine_type","operator":"==","value":r.get("Machine Type","")}],app,blank_rel(),blank_form(),src(f3.name,"other",v,table="Dyeing_Parameters_Quick_Reference",row=i,column=col),"high","pending",None)

# ---------- 4. ETP chemical dosing ----------
f4 = ROOT/"ETP TREATMENT RULES"/"DATA collected from ANTIGRAVITY"/"etp_chemical_dosing_rules.json"
if f4.exists():
    d=json.loads(f4.read_text(encoding="utf-8"))
    for c in d.get("chemicals",[]):
        mn,mx=parse_range(c.get("typical_dosage_mg_l",""))
        app=blank_app(chemical=[c.get("chemical_name","")],process_stage=[c.get("dosing_stage","")])
        rec(nid("KB"),"etp","recipe",c.get("chemical_name",""),"typical dosage",c.get("typical_dosage_mg_l"),mn,mx,"mg/L",[{"parameter":"dosing_stage","operator":"==","value":c.get("dosing_stage","")}],app,blank_rel(),blank_form(),src(f4.name,"other",json.dumps(c)[:800],section=c.get("dosing_stage")), "high","pending",c.get("purpose"))
        rec(nid("KB"),"etp","range",c.get("chemical_name",""),"optimum pH range",c.get("optimum_ph_range"),*parse_range(str(c.get("optimum_ph_range"))),"pH",[],app,blank_rel(),blank_form(),src(f4.name,"other",str(c.get("optimum_ph_range","")),section=c.get("dosing_stage")),"high","pending",None)
        if c.get("rule_statement"): rec(nid("KB"),"etp","process_step",c.get("chemical_name",""),"dosing rule",c.get("rule_statement"),None,None,None,[],app,blank_rel(),blank_form(),src(f4.name,"other",c.get("rule_statement"),section=c.get("dosing_stage")),"medium","pending",None)

# ---------- 5. ETP compliance ----------
f5 = ROOT/"ETP TREATMENT RULES"/"DATA collected from ANTIGRAVITY"/"etp_compliance_standards.json"
if f5.exists():
    d=json.loads(f5.read_text(encoding="utf-8"))
    for p in d.get("discharge_standards",[]):
        for col,vs in [("inland_surface_water_limit","pending"),("public_sewer_limit","pending"),("zld_target","pending")]:
            v=p.get(col)
            if v: rec(nid("KB"),"etp","constraint",p.get("parameter",""),col,v,first_num(str(v)),first_num(str(v)),p.get("unit"),[],blank_app(process_stage=["discharge"]),blank_rel(),blank_form(),src(f5.name,"other",str(v),section="discharge_standards"),"high","pending","monitoring: "+str(p.get("monitoring_frequency","")))
    for r_ in d.get("zld_mandate_rules",[]):
        rec(nid("KB"),"etp","constraint","ZLD mandate","rule statement",r_,None,None,None,[],blank_app(process_stage=["ZLD"]),blank_rel(),blank_form(),src(f5.name,"other",r_,section="zld_mandate_rules"),"high","pending",None)

# ---------- 6. ETP process rules ----------
f6 = ROOT/"ETP TREATMENT RULES"/"DATA collected from ANTIGRAVITY"/"etp_process_rules.json"
if f6.exists():
    d=json.loads(f6.read_text(encoding="utf-8"))
    for s in d.get("stages",[]):
        app=blank_app(process_stage=[s.get("stage_name","")])
        for o in s.get("operating_rules",[]):
            rec(nid("KB"),"etp","process_step",s.get("stage_name",""),o.get("rule_id",""),o.get("rule"),None,None,None,[],app,blank_rel(),blank_form(),src(f6.name,"other",o.get("rule"),section=s.get("stage_name")),"high","pending",s.get("objective"))
        for k,v in s.get("control_parameters",{}).items():
            rec(nid("KB"),"etp","range",s.get("stage_name",""),k,v,*parse_range(str(v)),None,[],app,blank_rel(),blank_form(),src(f6.name,"other",str(v),section=s.get("stage_name")),"high","pending",None)

# ---------- 7. ETP troubleshooting / zld / rulebook / treatment units ----------
for fname in ["etp_troubleshooting_rules.json","etp_zld_ro_rules.json","etp_treatment_rulebook_rag.json"]:
    fp=ROOT/"ETP TREATMENT RULES"/"DATA collected from ANTIGRAVITY"/fname
    if fp.exists():
        try: dd=json.loads(fp.read_text(encoding="utf-8"))
        except: continue
        txt=json.dumps(dd)[:2000]
        items=dd.get("diagnostic_rules") or dd.get("rules") or dd.get("entries") or []
        if isinstance(items,list) and items and isinstance(items[0],dict):
            for it in items[:60]:
                rec(nid("KB"),"etp","fact",it.get("symptom",it.get("rule_id",it.get("fault_id",fname))),it.get("stage",it.get("fault_id","property")),it.get("immediate_action_rule",it.get("rule",it.get("description",str(it)[:400]))),None,None,None,[],blank_app(process_stage=[it.get("stage","")]),blank_rel(),blank_form(),src(fp.name,"other",json.dumps(it)[:800],section="rules"),"medium","pending",it.get("root_cause",it.get("preventive_rule")))
        else:
            rec(nid("KB"),"etp","fact",fname,"content summary",txt[:600],None,None,None,[],blank_app(),blank_rel(),blank_form(),src(fp.name,"other",txt[:800]),"low","pending","full JSON preserved in source file")
for fname in ["etp_treatment_guide.md"]:
    fp=ROOT/"ETP TREATMENT RULES"/"DATA collected from ANTIGRAVITY"/fname
    if fp.exists():
        t=fp.read_text(encoding="utf-8",errors="ignore")
        for para in [p.strip() for p in re.split(r"\n\s*\n",t) if len(p.strip())>60][:40]:
            rec(nid("KB"),"etp","fact","ETP treatment guide","statement",para[:600],None,None,None,[],blank_app(),blank_rel(),blank_form(),src(fp.name,"other",para[:800],section="guide"),"medium","pending",None)
fp7=ROOT/"new etp data"/"01_ETP_Treatment_Rules"/"02_Treatment_Units"/"data.csv"
if fp7.exists():
    rows=list(csv.DictReader(fp7.read_text(encoding="utf-8",errors="ignore").splitlines()))
    for i,r in enumerate(rows,1):
        app=blank_app(process_stage=[r.get("Unit Name","")])
        for col in ["Design Capacity","Hydraulic Retention Time (HRT)","Operating pH","Operating Temperature","Removal Efficiency","Expected Output Quality","Pollutants Removed"]:
            v=r.get(col,"")
            if v: rec(nid("KB"),"etp","fact",r.get("Unit Name",""),col,v,*parse_range(v),None,[],app,blank_rel(),blank_form(),src(fp7.name,"other",v,table="Treatment_Units",row=i,column=col),"high","pending",r.get("Unit Function",""))

# ---------- 8. File inventory for PDFs and others (dedup by hash) ----------
exts={".pdf": "pdf",".doc":"doc",".docx":"docx",".csv":"csv",".xls":"xls",".xlsx":"xlsx",".ppt":"ppt",".pptx":"pptx",".txt":"txt",".md":"other",".json":"other",".html":"other"}
seen=set()
for p in ROOT.rglob("*"):
    if not p.is_file(): continue
    e=p.suffix.lower()
    if e not in exts: continue
    if any(x in str(p).lower() for x in ["master_knowledge_base",".claude","settings.local"]): continue
    try:
        h=hashlib.md5(p.read_bytes()[:2000000]).hexdigest()+str(p.stat().st_size)
    except: continue
    if h in seen: continue
    seen.add(h)
    # skip files already parsed in detail to avoid double count? still add inventory only for pdf/doc/ppt
    if e in [".pdf",".doc",".docx",".ppt",".pptx"]:
        rel=str(p.relative_to(ROOT))
        rec(nid("KB"),"wastewater" if "etp" in rel.lower() or "effluent" in rel.lower() else "dyeing","fact",p.name,"source document inventory","Relevant source file held in dataset; full text extraction pending detailed page-level parsing.",None,None,None,[],blank_app(),blank_rel(),blank_form(),src(p.name,exts[e],"File: "+rel+" | size "+str(p.stat().st_size)+" bytes"),"low","pending","Temporary/system/duplicate/unrelated files excluded; this file retained as in-scope. Verify relevance before rule conversion.")

OUT.write_text(json.dumps({"knowledge_records":records},indent=1),encoding="utf-8")
print(f"wrote {len(records)} records to {OUT}")
