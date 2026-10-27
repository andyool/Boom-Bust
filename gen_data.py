"""Single source of truth for the companion app's game data.
Writes game-data.json and Markdown tables used in SPEC.md."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

ECONOMY = [
    {"key": "RECESSION", "icon": "E01"}, {"key": "SLOW", "icon": "E02"}, {"key": "STEADY", "icon": "E03"},
    {"key": "GROWTH", "icon": "E04"}, {"key": "BOOM", "icon": "E05"}]

INDUSTRIES = {
    "market_stalls": {"name": "Market Stalls", "sector": "tertiary", "colour": "#D9A35B", "kind": "customer"},
    "food_shops":    {"name": "Food Shops", "sector": "tertiary", "colour": "#4FB3E8", "kind": "customer"},
    "trades":        {"name": "Trades", "sector": "tertiary", "colour": "#7B3FA0", "kind": "customer"},
    "takeaway":      {"name": "Takeaway", "sector": "tertiary", "colour": "#F26B2A", "kind": "customer"},
    "fun_fitness":   {"name": "Fun & Fitness", "sector": "tertiary", "colour": "#F2668B", "kind": "customer"},
    "big_shops":     {"name": "Big Shops", "sector": "tertiary", "colour": "#F7C531", "kind": "customer"},
    "factories":     {"name": "Factories", "sector": "secondary", "colour": "#1E7A4C", "kind": "employer", "shiftPay": 20, "shiftPayIfOwnsAll": 10},
    "mines":         {"name": "Mines", "sector": "primary", "colour": "#3A3A3A", "kind": "employer", "shiftPay": 40, "shiftPayIfOwnsAll": 20},
    "transport":     {"name": "Transport", "sector": "tertiary", "colour": "#03284E", "kind": "transport", "perTransportOwned": 20},
    "utilities":     {"name": "Utilities", "sector": "government", "colour": "#FFFFFF", "kind": "utility", "bill": 20},
}

def biz(id_, name, ind, price, cust, profit, site, tile, deed):
    return {"id": id_, "name": name, "industry": ind, "price": price,
            "customerPrices": dict(zip(["budget", "standard", "premium", "monopoly"], cust)) if cust else None,
            "profit": dict(zip([e["key"] for e in ECONOMY], profit)), "extraSiteCost": site,
            "tile": tile, "deed": deed}

BUSINESSES = [
    biz("coffee_cart", "Coffee Cart", "market_stalls", 60, [10, 20, 30, 40], [0, 10, 10, 20, 30], 30, "B01", "D01"),
    biz("fruit_veg", "Fruit & Veg Stall", "market_stalls", 60, [10, 20, 30, 40], [0, 10, 10, 20, 30], 30, "B02", "D02"),
    biz("bakery", "Bakery", "food_shops", 100, [10, 20, 30, 40], [10, 20, 20, 20, 30], 50, "B03", "D03"),
    biz("butcher", "Butcher", "food_shops", 100, [10, 20, 30, 40], [10, 20, 20, 20, 30], 50, "B04", "D04"),
    biz("corner_deli", "Corner Deli", "food_shops", 120, [10, 20, 30, 40], [10, 20, 20, 20, 30], 50, "B05", "D05"),
    biz("car_mechanic", "Car Mechanic", "trades", 140, [20, 30, 40, 60], [0, 10, 20, 30, 40], 70, "B06", "D06"),
    biz("plumber", "Plumber", "trades", 140, [20, 30, 40, 60], [0, 10, 20, 30, 40], 70, "B07", "D07"),
    biz("electrician", "Electrician", "trades", 160, [20, 30, 40, 60], [0, 10, 20, 30, 40], 70, "B08", "D08"),
    biz("pizza_place", "Pizza Place", "takeaway", 180, [20, 30, 40, 60], [10, 20, 30, 30, 40], 90, "B09", "D09"),
    biz("burger_bar", "Burger Bar", "takeaway", 180, [20, 30, 40, 60], [10, 20, 30, 30, 40], 90, "B10", "D10"),
    biz("sushi_bar", "Sushi Bar", "takeaway", 200, [20, 30, 40, 60], [10, 20, 30, 30, 40], 90, "B11", "D11"),
    biz("gym", "Gym", "fun_fitness", 220, [20, 40, 50, 80], [-20, 0, 30, 50, 70], 110, "B12", "D12"),
    biz("cinema", "Cinema", "fun_fitness", 220, [20, 40, 50, 80], [-20, 0, 30, 50, 70], 110, "B13", "D13"),
    biz("trampoline_park", "Trampoline Park", "fun_fitness", 240, [20, 40, 50, 80], [-20, 0, 30, 50, 70], 110, "B14", "D14"),
    biz("clothing_store", "Clothing Store", "big_shops", 260, [30, 40, 60, 80], [-10, 20, 40, 50, 60], 130, "B15", "D15"),
    biz("electronics_store", "Electronics Store", "big_shops", 260, [30, 40, 60, 80], [-10, 20, 40, 50, 60], 130, "B16", "D16"),
    biz("supermarket", "Supermarket", "big_shops", 280, [30, 40, 60, 80], [40, 40, 40, 40, 50], 140, "B17", "D17"),
    biz("furniture_factory", "Furniture Factory", "factories", 300, None, [-30, 10, 50, 70, 90], 150, "B18", "D18"),
    biz("boat_builder", "Boat Builder", "factories", 300, None, [-30, 10, 50, 70, 90], 150, "B19", "D19"),
    biz("solar_factory", "Solar Panel Factory", "factories", 320, None, [-30, 10, 50, 70, 90], 150, "B20", "D20"),
    biz("lithium_mine", "Lithium Mine", "mines", 350, None, [-50, 0, 60, 100, 150], 180, "B21", "D21"),
    biz("iron_ore_mine", "Iron Ore Mine", "mines", 400, None, [-40, 20, 70, 110, 160], 200, "B22", "D22"),
    biz("trucking", "Trucking Company", "transport", 200, None, [0, 10, 20, 30, 40], None, "B23", "D23"),
    biz("freight_railway", "Freight Railway", "transport", 200, None, [0, 10, 20, 30, 40], None, "B24", "D24"),
    biz("fremantle_port", "Fremantle Port", "transport", 200, None, [0, 10, 20, 30, 40], None, "B25", "D25"),
    biz("perth_airport", "Perth Airport", "transport", 200, None, [0, 10, 20, 30, 40], None, "B26", "D26"),
    biz("power_company", "Power Company", "utilities", None, None, [20, 20, 20, 20, 20], None, "A06", "D27"),
    biz("water_company", "Water Company", "utilities", None, None, [20, 20, 20, 20, 20], None, "A07", "D28"),
]
BIZ_BY_TILE = {b["tile"]: b["id"] for b in BUSINESSES}

SPACE_ORDER = ['C01', 'B01', 'A01', 'B02', 'A04', 'B23', 'B03', 'A03', 'B04', 'B05',
               'C02', 'B06', 'A06', 'B07', 'B08', 'B24', 'B09', 'A01', 'B10', 'B11',
               'C03', 'B12', 'A02', 'B13', 'B14', 'B25', 'B15', 'B16', 'A07', 'B17',
               'C04', 'B18', 'B19', 'A01', 'B20', 'B26', 'A02', 'B21', 'A05', 'B22']
SPECIAL = {'C01': ('payday', 'PAYDAY'), 'C02': ('job_centre', 'JOB CENTRE'), 'C03': ('parliament', 'PARLIAMENT'),
           'C04': ('job_cut', 'JOB CUT'), 'A01': ('life', 'Life card'), 'A02': ('market', 'Market card'),
           'A03': ('open_day', 'TAFE & Uni Open Day'), 'A04': ('tax_time', 'Tax Time'), 'A05': ('super_fund', 'Super Fund')}

def side(pos):
    if pos in (0, 10, 20, 30): return 'corner'
    return ['bottom', 'right', 'top', 'left'][pos // 10]

SPACES = []
for pos, tile in enumerate(SPACE_ORDER):
    if tile in BIZ_BY_TILE:
        b = next(x for x in BUSINESSES if x["tile"] == tile)
        kind = 'utility' if b["industry"] == 'utilities' else 'business'
        SPACES.append({"pos": pos, "tile": tile, "kind": kind, "businessId": b["id"], "label": b["name"], "side": side(pos)})
    else:
        k, lab = SPECIAL[tile]
        SPACES.append({"pos": pos, "tile": tile, "kind": k, "label": lab, "side": side(pos)})

JOB_LEVELS = {
    "entry": {"pay": 100, "tax": 10, "takeHome": 90, "jobRisk": "always_lose", "dieLoseMax": 6},
    "skilled": {"pay": 160, "tax": 30, "takeHome": 130, "jobRisk": "die_1_to_3", "dieLoseMax": 3},
    "professional": {"pay": 220, "tax": 50, "takeHome": 170, "jobRisk": "die_1_to_2", "dieLoseMax": 2},
}
JOBS = [{"id": f"J{i:02d}", "name": n, "level": lv, "card": f"J{i:02d}"} for i, (n, lv) in enumerate([
    ("Retail Assistant", "entry"), ("Kitchen Hand", "entry"), ("Cashier", "entry"), ("Delivery Driver", "entry"),
    ("Farm Hand", "entry"), ("Cleaner", "entry"), ("Chef", "skilled"), ("Hairdresser", "skilled"),
    ("Childcare Educator", "skilled"), ("Carpenter", "skilled"), ("Welder", "skilled"), ("Aged Care Worker", "skilled"),
    ("Nurse", "professional"), ("Engineer", "professional"), ("Teacher", "professional"), ("Accountant", "professional"),
    ("Software Developer", "professional"), ("Geologist", "professional")], 1)]

TRACKS = {
    "prices": {"level": 2, "icon": "I01", "positions": [1, 2, 3, 4, 5, 6], "start": 2,
               "livingCosts": {"1": 60, "2": 70, "3": 80, "4": 90, "5": 100, "6": 120}, "customerPriceBonusFrom": 4, "customerPriceBonus": 10},
    "wages": {"level": 2, "icon": "I02", "positions": [0, 1, 2, 3, 4, 5], "start": 0, "takeHomeBonusPerStep": 10},
    "interest": {"level": 2, "icon": "I03", "positions": ["LOW", "NORMAL", "HIGH", "VERY HIGH"], "start": "NORMAL",
                 "loanInterest": {"LOW": 10, "NORMAL": 20, "HIGH": 30, "VERY HIGH": 40},
                 "savingsInterestPer200": {"LOW": 0, "NORMAL": 10, "HIGH": 20, "VERY HIGH": 30}},
}

PROJECTS = [{"order": i, "id": f"PP{i}", "name": n, "tile": f"PP{i}"} for i, n in enumerate(
    ["Roads & Bridges", "Public Hospital", "New High School", "Fast Internet", "Train Line"], 1)]

CONSTANTS = {
    "startCash": 400, "treasuryStart": 200, "livingCostsLevel1": 70, "loanSize": 200, "loanInterestLevel1": 20,
    "loanLimit": "1 per business owned + 1 if employed", "hecsPerPayday": 20, "jobSeeker": 50, "studyAllowance": 30,
    "tafeFee": 50, "tafeTokens": 1, "uniTokens": 2, "superFundEmployer": 50, "superFundOwnMax": 100,
    "companyTaxPerBusiness": 20, "utilityBill": 20, "projectCost": 300, "projectBuildThreshold": 400,
    "projectPaysPerPlayer": 10, "bondSize": 200, "bondInterestLevel2": 10, "maxExtraSites": 2,
    "sellToBankFraction": 0.5, "bankruptTokens": 3, "cartelFine": 100, "supplyDealPerPayday": 20,
    "maxSupplyDealsPerPlayer": 2, "supplyDealCards": 6, "endGamePaydays": 5, "superMultiplierAtEnd": 2,
    "loanValueAtEnd": -200, "hecsValueAtEnd": -100, "businessMultiplierAtEnd": {"RECESSION": 0.5, "BOOM": 1.5},
    "auctionMinBid": 10, "utilityAuctionMinBid": 100, "maxLaws": 3, "debateSeconds": 30,
    "notes": [500, 100, 50, 20, 10], "savingsBlock": 200, "superFundStep": 10, "economyStart": "STEADY",
}

LINKED_INDUSTRIES = [["mines", "factories"], ["factories", "big_shops"], ["food_shops", "takeaway"],
                     ["trades", "fun_fitness"], ["transport", "*"]]

def card(id_, deck, title, text, logic, econ=0, level=1, keep=False, inputs=None, l2=None, law=None):
    d = {"id": id_, "deck": deck, "title": title, "image": id_, "level": level, "text": text, "logic": logic}
    if deck == "news": d["economy"] = econ
    if l2: d["level2"] = l2
    if keep: d["keep"] = True
    if inputs: d["inputs"] = inputs
    if law is not None: d["isLaw"] = law
    return d

N = "news"
NEWS = [
    card("N01", N, "Iron ore sales to Asia soar", "Economy up 1. The Iron Ore Mine owner collects $50.",
         "Owner of iron_ore_mine collects $50 from Bank.", 1),
    card("N02", N, "Shoppers are spending again", "Economy up 1.", "No money moves.", 1),
    card("N03", N, "New suburbs planned: builders flat out", "Economy up 1. Trades owners collect $20 per Trades business.",
         "Each player collects $20 x (trades businesses they own) from Bank.", 1),
    card("N04", N, "Tourists flock back to WA", "Economy up 1. Fun & Fitness owners collect $20 per business.",
         "Each player collects $20 x (fun_fitness businesses they own) from Bank.", 1),
    card("N05", N, "Lithium rush for electric car batteries", "Economy up 1. The Lithium Mine owner collects $50.",
         "Owner of lithium_mine collects $50 from Bank.", 1),
    card("N06", N, "Government spends big on roads and rail", "Economy up 1. Treasury builds the next Public Project now, borrowing if it must.",
         "Treasury builds the next unbuilt Public Project now ($300 to Bank), borrowing Bonds if short. Nothing extra if all 5 are built.", 1),
    card("N07", N, "Record wheat harvest", "Economy up 1. Food Shop owners collect $20 per Food Shop.",
         "Each player collects $20 x (food_shops businesses they own: Bakery, Butcher, Corner Deli; not the Supermarket) from Bank.", 1),
    card("N08", N, "Businesses confident: new shops opening", "Economy up 1.", "No money moves.", 1),
    card("N09", N, "Overseas orders dry up", "Economy down 1. Factory owners pay $20 per Factory.",
         "Each player pays $20 x (factories they own) to Bank.", -1),
    card("N10", N, "Shoppers tighten their belts", "Economy down 1.", "No money moves.", -1),
    card("N11", N, "Banking crisis overseas", "Economy down 2. Nobody can take a new loan until the next News card.",
         "Set flag noNewLoans = true. Clear it when the next News card is resolved.", -2),
    card("N12", N, "Pandemic: shops shut for a month", "Economy down 2. Treasury pays every player $50 support, borrowing if it must.",
         "Treasury pays $50 to every player, borrowing Bonds if short.", -2),
    card("N13", N, "Trade war: new taxes on our exports", "Economy down 1. Mine owners pay $30 per Mine.",
         "Each player pays $30 x (mines they own) to Bank.", -1),
    card("N14", N, "Share market crash", "Economy down 1. Every player loses $50 from their Super, if they have it.",
         "Each player's Super falls by min($50, their Super). That money goes from their Super pile to the Bank.", -1),
    card("N15", N, "Quiet quarter: no big news", "Nothing changes.", "Nothing happens.", 0),
    card("N16", N, "Experts say steady as she goes", "Nothing changes.", "Nothing happens.", 0),
    card("N17", N, "Oil price shock", "Transport owners pay $20 per transport business. Level 2: Prices up 1.",
         "Each player pays $20 x (transport businesses they own) to Bank.", 0, l2={"prices": 1}),
    card("N18", N, "Drought pushes up food prices", "Takeaway owners pay $20 per Takeaway. Level 2: Prices up 1.",
         "Each player pays $20 x (takeaway businesses they own) to Bank.", 0, l2={"prices": 1}),
    card("N19", N, "Minimum wage goes up", "Every business owner pays $10 per business. Level 2: Wages up 1.",
         "Each player pays $10 x (all businesses they own, including transport and sold utilities) to Bank.", 0, l2={"wages": 1}),
    card("N20", N, "Self-checkouts everywhere", "The Cashier and the Retail Assistant lose their jobs.",
         "Players holding J03 Cashier or J01 Retail Assistant who are employed become looking for work (Volunteer card L12 may be handed in).", 0),
    card("N21", N, "Robots in warehouses and kitchens", "The Delivery Driver and the Kitchen Hand lose their jobs.",
         "Players holding J04 Delivery Driver or J02 Kitchen Hand who are employed become looking for work (L12 may be handed in).", 0),
    card("N22", N, "Tech boom: skilled workers wanted", "Every Skilled and Professional worker collects $30. Skilled and Professional players looking for work get their jobs back.",
         "First: every employed Skilled or Professional worker collects $30 from Bank. Then: every Skilled or Professional player looking for work becomes employed (they do not get the $30).", 0),
    card("N23", N, "Australian dollar falls", "Mine and Factory owners collect $20 per business, because our exports are cheaper overseas. Level 2: Prices up 1, because imports cost more.",
         "Each player collects $20 x (mines + factories they own) from Bank.", 0, l2={"prices": 1}),
    card("N24", N, "Bushfire emergency", "Treasury pays $100 to the Bank for recovery, borrowing if it must. Market Stall and Fun & Fitness owners pay $20 per business.",
         "Treasury pays $100 to Bank (borrow if short). Each player pays $20 x (market_stalls + fun_fitness businesses they own) to Bank.", 0),
]

L = "life"
LIFE = [
    card("L01", L, "Car breaks down", "Pay $60 to the Bank.", "Drawer pays $60 to Bank."),
    card("L02", L, "Cracked phone screen", "Pay $40 to the Bank.", "Drawer pays $40 to Bank."),
    card("L03", L, "It's your birthday", "Every player gives you $10.", "Every other player pays the drawer $10."),
    card("L04", L, "Sold your old bike online", "Collect $30 from the Bank.", "Drawer collects $30 from Bank."),
    card("L05", L, "Tax refund", "Collect $40 from Treasury.", "Drawer collects $40 from Treasury (borrow if short)."),
    card("L06", L, "Sick for a week", "Entry job: lose $50, because casual workers get no sick pay. Skilled or Professional: you get paid sick leave, so nothing happens.",
         "If drawer is employed in an Entry job: pays $50 to Bank. Otherwise nothing."),
    card("L07", L, "Promotion at work", "If you have a job, collect $50 from the Bank.", "If drawer is employed: collects $50 from Bank."),
    card("L08", L, "Speeding fine", "Pay $100 to Treasury.", "Drawer pays $100 to Treasury."),
    card("L09", L, "Scam text message", "If you have more than $300 in cash, the scammer takes $100 (pay the Bank). Never click links in texts.",
         "Ask the drawer: more than $300 cash? Yes: pays $100 to Bank. Savings are safe.", inputs=["askCashOver300"]),
    card("L10", L, "Buy now, pay later trap", "Pay $60 to the Bank: $50 for the shoes and a $10 late fee.", "Drawer pays $60 to Bank."),
    card("L11", L, "Cheaper phone plan", "You shopped around. Collect $20 from the Bank.", "Drawer collects $20 from Bank."),
    card("L12", L, "Volunteer at the community garden", "KEEP. Next time you lose your job, hand this in to get it back straight away. Someone gave you a reference.",
         "Drawer keeps it. The next time they would lose their job (any cause), offer to hand it in: job kept, card returns to the deck.", keep=True),
    card("L13", L, "Move into a share house", "KEEP. Pay $10 less living costs at every Payday.",
         "Drawer keeps it for the rest of the game: living costs -$10 at every Payday.", keep=True),
    card("L14", L, "Rent goes up", "Pay $40 to the Bank.", "Drawer pays $40 to Bank."),
    card("L15", L, "Free online course", "KEEP. Hand this in to do TAFE with no fee.",
         "Drawer keeps it. When they enrol in TAFE, offer to hand it in: no fee. Card returns to the deck.", keep=True),
    card("L16", L, "Dentist visit", "Pay $80 to the Bank. Medicare does not cover most dental care.", "Drawer pays $80 to Bank."),
    card("L17", L, "Side hustle", "You sell drawings online. Collect $40 from the Bank.", "Drawer collects $40 from Bank."),
    card("L18", L, "Broken arm", "Medicare covers the hospital. Pay only $20 to the Bank. Without public health care this could cost thousands.",
         "Drawer pays $20 to Bank."),
    card("L19", L, "Insurance offer", "Pay $30 to the Bank to KEEP this card, or put it back. It covers your next Car Crash or Fire card.",
         "Ask: buy insurance? Yes: drawer pays $30 to Bank and keeps the card. It cancels the next L20 Car Crash or M13 Fire payment, then returns to the deck.",
         keep=True, inputs=["askBuyInsurance"]),
    card("L20", L, "Car crash", "Pay $150 to the Bank, unless you hand in an Insurance card.",
         "Drawer pays $150 to Bank unless they hold L19: then hand it in and pay nothing."),
]

M = "market"
MARKET = [
    card("M01", M, "Video goes viral", "Takeaway owners collect $30 per Takeaway.", "Each player collects $30 x (takeaway they own) from Bank."),
    card("M02", M, "Health inspector visit", "Takeaway owners pay $20 per Takeaway to Treasury.", "Each player pays $20 x (takeaway they own) to Treasury."),
    card("M03", M, "Equipment breaks down", "You pay $20 to the Bank for each business you own.", "Drawer pays $20 x (all businesses they own) to Bank."),
    card("M04", M, "Suppliers raise prices", "Food Shop and Takeaway owners pay $20 per business to the Bank.",
         "Each player pays $20 x (food_shops + takeaway they own) to Bank."),
    card("M05", M, "Big chain store opens nearby", "Market Stall and Food Shop owners pay $20 per business to the Bank. Small shops lose customers.",
         "Each player pays $20 x (market_stalls + food_shops they own) to Bank."),
    card("M06", M, "Online shopping takes off", "Clothing Store and Electronics Store owners pay $30 each. Transport owners collect $20 per transport business.",
         "Each player pays $30 x (clothing_store + electronics_store they own) to Bank. Each player collects $20 x (transport they own) from Bank."),
    card("M07", M, "Workplace safety fine", "Factory and Mine owners pay $40 per business to Treasury.",
         "Each player pays $40 x (factories + mines they own) to Treasury. Law P15 in force: $20 instead."),
    card("M08", M, "Pollution clean-up", "Factory and Mine owners pay $30 per business to Treasury. The river was polluted and someone has to pay to fix it.",
         "Each player pays $30 x (factories + mines they own) to Treasury. Law P15 in force: $15 instead."),
    card("M09", M, "Small business grant", "If you own a Market Stall or Food Shop, collect $50 from Treasury.",
         "If drawer owns at least one market_stalls or food_shops business: collects $50 once from Treasury (borrow if short)."),
    card("M10", M, "Staff shortage", "Every business owner pays $10 per business to the Bank for overtime.",
         "Each player pays $10 x (all businesses they own) to Bank."),
    card("M11", M, "Big overseas order", "Factory owners collect $40 per Factory.", "Each player collects $40 x (factories they own) from Bank."),
    card("M12", M, "Business course", "You may add an Extra Site to one business now for half price.",
         "Optional: drawer picks one of their businesses with fewer than 2 Extra Sites (not transport or utilities) and adds a site for half its Extra Site cost, paid to Bank.",
         inputs=["chooseOwnBusiness"]),
    card("M13", M, "Fire!", "If you own any business, pay $100 to the Bank, unless you hand in an Insurance card.",
         "If drawer owns any business: pays $100 to Bank unless they hold L19 (hand it in, pay nothing)."),
    card("M14", M, "Bargain for sale", "You may buy any business nobody owns for half its price.",
         "Optional: drawer picks any unowned business (not utilities) and buys it for half its price, paid to Bank.", inputs=["chooseUnownedBusiness"]),
    card("M15", M, "Supply deal", "Choose another player who owns a business. You both collect $30 from the Bank. Working together helps both of you.",
         "Drawer picks another player who owns at least one business. Both collect $30 from Bank. If nobody else owns a business, nothing happens.",
         inputs=["chooseOtherOwner"]),
    card("M16", M, "ACCC investigation", "Anyone who owns every business in an industry pays $100 to Treasury. Level 3: they must also set Standard prices until their next Payday.",
         "For each player and each industry (not utilities) where they own every business: pay $100 to Treasury. Level 3: those businesses are forced to Standard price until that owner's next Payday."),
]

P = "policy"
POLICY = [
    card("P01", P, "Raise the minimum wage", "Entry workers take home $20 more. At Payday, business owners pay $10 per business.",
         "Law. Employed Entry workers: take-home +$20 (from Bank). At each player's Payday: pay $10 x (all businesses they own) to Bank.", level=2, law=True),
    card("P02", P, "Cut income tax", "Every worker takes home $10 more, and Treasury gets $10 less from each.",
         "Law. Employed workers: take-home +$10 and tax -$10 (Bank pays the same total).", level=2, law=True),
    card("P03", P, "Raise company tax", "Tax Time costs $30 per business.", "Law. Tax Time is $30 per business.", level=2, law=True),
    card("P04", P, "Cut company tax", "Tax Time costs $10 per business.", "Law. Tax Time is $10 per business.", level=2, law=True),
    card("P05", P, "Free TAFE", "TAFE has no fee.", "Law. TAFE fee is $0.", level=2, law=True),
    card("P06", P, "Build it now", "Treasury builds the next Public Project now, borrowing if it must. This card then goes to the bottom of the deck instead of staying as a law.",
         "One-off if passed: Treasury builds the next Public Project now (borrow if short). Not kept as a law.", level=2, law=False),
    card("P07", P, "Raise JobSeeker", "Players looking for work collect $70.", "Law. JobSeeker is $70.", level=2, law=True),
    card("P08", P, "Cut JobSeeker", "Players looking for work collect $30.", "Law. JobSeeker is $30.", level=2, law=True),
    card("P09", P, "Carbon price", "At Payday, Factory and Mine owners pay $20 per business to Treasury. The Solar Panel Factory owner collects $20 instead.",
         "Law. At each player's Payday: pay $20 x (factories + mines they own, excluding solar_factory) to Treasury; if they own solar_factory, collect $20 from Treasury.", level=2, law=True),
    card("P10", P, "Sell the utilities", "Auction the Power Company and Water Company now, bidding from $100. Owners collect the $20 bills. They stay sold even if this law is later removed.",
         "Law. Immediately auction power_company then water_company (min bid $100, winner pays Treasury; no bid = stays government). Owned utilities: lander pays owner $20; owner gets $20 profit at every Payday. Stay sold if the law is removed.",
         level=2, law=True, inputs=["auction"]),
    card("P11", P, "Raise GST", "Every player pays $10 more living costs, and that $10 goes to Treasury.",
         "Law. Living costs +$10 at every Payday; that $10 goes to Treasury, the rest to Bank.", level=2, law=True),
    card("P12", P, "Tax on imports", "At Payday, Factory owners collect $20 per Factory. Living costs go up $10.",
         "Law. At each player's Payday: collect $20 x (factories they own) from Bank. Living costs +$10 (to Bank).", level=2, law=True),
    card("P13", P, "Cap food prices", "Food Shops and the Supermarket charge customers $10 less. Level 3: Budget price only.",
         "Law. Food Shops and Supermarket customer prices -$10 (min $0). Level 3: these businesses can only charge Budget.", level=2, law=True),
    card("P14", P, "Tax on big fortunes", "At Payday, anyone with more than $1,000 in cash and Savings pays $50 to Treasury.",
         "Law. At each player's Payday ask: cash + Savings over $1,000? (app knows Savings, ask about cash) Yes: pay $50 to Treasury.", level=2, law=True,
         inputs=["askCashPlusSavingsOver1000"]),
    card("P15", P, "Cut red tape", "Safety fine and Pollution clean-up cards cost half.", "Law. M07 and M08 cost half.", level=2, law=True),
    card("P16", P, "Free trade deal", "Living costs go down $10. At Payday, Factory owners pay $10 per Factory.",
         "Law. Living costs -$10. At each player's Payday: pay $10 x (factories they own) to Bank.", level=2, law=True),
]

S = "starting_life"
STARTING = [
    card("S01", S, "Family can help", "Start with $700. Your first TAFE or Uni course is free, with no HECS card.",
         "Start cash $700. Their first TAFE or Uni enrolment has no fee and no HECS card.", level=3),
    card("S02", S, "Moved out at 17", "Start with $200.", "Start cash $200.", level=3),
    card("S03", S, "Grew up in a country town", "Start with $400. TAFE costs you $100 because you must travel.",
         "Start cash $400. Their TAFE fee is $100 (unless TAFE is free for them).", level=3),
    card("S04", S, "Family business", "Start with $300 and the Coffee Cart.", "Start cash $300 and they own coffee_cart.", level=3),
    card("S05", S, "Young carer", "Start with $300. Take home $20 less at every Payday because you work fewer hours.",
         "Start cash $300. Take-home pay -$20 at every Payday while employed.", level=3),
    card("S06", S, "Average start", "Start with $400.", "Start cash $400. The physical deck has 3 copies of this card.", level=3),
]

# Machine-readable card effects for the app's rules engine. Each card's `logic` text above is the
# human description; `effect` below must say the same thing (checked by check_effects()).
# Ops: who = "drawer" (card drawer / Payday player), "each" (every player), "others" (every other
# player), "ownerOf" (owner of `business`). with = "bank" | "treasury" | "drawer". `per` multiplies
# the amount by businesses owned: {"all": true}, {"industries": [...], "except": [...]}, {"businesses": [...]}.
def pay(amount, per=None, who="drawer", to="bank", **kw):
    return {"do": "pay", "who": who, "amount": amount, "with": to, **({"per": per} if per else {}), **kw}

def collect(amount, per=None, who="drawer", frm="bank", **kw):
    return {"do": "collect", "who": who, "amount": amount, "with": frm, **({"per": per} if per else {}), **kw}

def IND(*xs): return {"industries": list(xs)}
def BIZ(*xs): return {"businesses": list(xs)}
ALL = {"all": True}

EFFECTS = {
    # Economy News: the economy arrow is `economy`; these are the card's own effects.
    "N01": [collect(50, who="ownerOf", business="iron_ore_mine")],
    "N02": [],
    "N03": [collect(20, IND("trades"), who="each")],
    "N04": [collect(20, IND("fun_fitness"), who="each")],
    "N05": [collect(50, who="ownerOf", business="lithium_mine")],
    "N06": [{"do": "buildProject"}],
    "N07": [collect(20, IND("food_shops"), who="each")],
    "N08": [],
    "N09": [pay(20, IND("factories"), who="each")],
    "N10": [],
    "N11": [{"do": "setFlag", "flag": "noNewLoans"}],
    "N12": [collect(50, who="each", frm="treasury")],
    "N13": [pay(30, IND("mines"), who="each")],
    "N14": [{"do": "superLoss", "amount": 50}],
    "N15": [],
    "N16": [],
    "N17": [pay(20, IND("transport"), who="each")],
    "N18": [pay(20, IND("takeaway"), who="each")],
    "N19": [pay(10, ALL, who="each")],
    "N20": [{"do": "loseJob", "jobs": ["J03", "J01"]}],
    "N21": [{"do": "loseJob", "jobs": ["J04", "J02"]}],
    "N22": [collect(30, who="each", **{"if": "employedSkilledUp"}), {"do": "regainJob", "levels": ["skilled", "professional"]}],
    "N23": [collect(20, IND("mines", "factories"), who="each")],
    "N24": [{"do": "treasuryToBank", "amount": 100}, pay(20, IND("market_stalls", "fun_fitness"), who="each")],
    # Life
    "L01": [pay(60)], "L02": [pay(40)],
    "L03": [pay(10, who="others", to="drawer")],
    "L04": [collect(30)],
    "L05": [collect(40, frm="treasury")],
    "L06": [pay(50, **{"if": "employedEntry"})],
    "L07": [collect(50, **{"if": "employed"})],
    "L08": [pay(100, to="treasury")],
    "L09": [pay(100, ask="askCashOver300")],
    "L10": [pay(60)], "L11": [collect(20)],
    "L12": [{"do": "keep", "saveJob": True}],
    "L13": [{"do": "keep", "livingAdjust": -10}],
    "L14": [pay(40)],
    "L15": [{"do": "keep", "freeTafe": True}],
    "L16": [pay(80)], "L17": [collect(40)], "L18": [pay(20)],
    "L19": [{"do": "keep", "ask": "askBuyInsurance", "cost": 30, "with": "bank", "cancels": ["L20", "M13"]}],
    "L20": [pay(150, unlessKeep="L19")],
    # Market
    "M01": [collect(30, IND("takeaway"), who="each")],
    "M02": [pay(20, IND("takeaway"), who="each", to="treasury")],
    "M03": [pay(20, ALL)],
    "M04": [pay(20, IND("food_shops", "takeaway"), who="each")],
    "M05": [pay(20, IND("market_stalls", "food_shops"), who="each")],
    "M06": [pay(30, BIZ("clothing_store", "electronics_store"), who="each"), collect(20, IND("transport"), who="each")],
    "M07": [pay(40, IND("factories", "mines"), who="each", to="treasury", lawAmount={"P15": 20})],
    "M08": [pay(30, IND("factories", "mines"), who="each", to="treasury", lawAmount={"P15": 15})],
    "M09": [collect(50, frm="treasury", **{"if": {"ownsAnyIn": ["market_stalls", "food_shops"]}})],
    "M10": [pay(10, ALL, who="each")],
    "M11": [collect(40, IND("factories"), who="each")],
    "M12": [{"do": "discountSite", "fraction": 0.5}],
    "M13": [pay(100, unlessKeep="L19", **{"if": "ownsAnyBusiness"})],
    "M14": [{"do": "bargain", "fraction": 0.5}],
    "M15": [{"do": "supplyBonus", "amount": 30, "with": "bank"}],
    "M16": [{"do": "monopolyFine", "amount": 100, "with": "treasury", "level3ForceStandard": True}],
    # Policy: `law` holds the settings while in force, `payday` runs at each player's Payday,
    # `oneOff` runs once when passed.
    "P01": {"law": {"entryTakeHomeBonus": 20}, "payday": [pay(10, ALL)]},
    "P02": {"law": {"takeHomeBonus": 10, "taxCut": 10}},
    "P03": {"law": {"companyTaxPerBusiness": 30}},
    "P04": {"law": {"companyTaxPerBusiness": 10}},
    "P05": {"law": {"tafeFee": 0}},
    "P06": {"oneOff": [{"do": "buildProject"}]},
    "P07": {"law": {"jobSeeker": 70}},
    "P08": {"law": {"jobSeeker": 30}},
    "P09": {"payday": [pay(20, {"industries": ["factories", "mines"], "except": ["solar_factory"]}, to="treasury"),
                       collect(20, BIZ("solar_factory"), frm="treasury")]},
    "P10": {"oneOff": [{"do": "auctionUtilities", "businesses": ["power_company", "water_company"]}]},
    "P11": {"law": {"livingToTreasury": 10}},
    "P12": {"law": {"livingAdjust": 10}, "payday": [collect(20, IND("factories"))]},
    "P13": {"law": {"customerPriceCut": 10, "capIndustries": ["food_shops"], "capBusinesses": ["supermarket"], "level3Clip": "budget"}},
    "P14": {"law": {"fortuneThreshold": 1000, "fortuneTax": 50}},
    "P15": {"law": {"redTape": True}},
    "P16": {"law": {"livingAdjust": -10}, "payday": [pay(10, IND("factories"))]},
    # Starting Life
    "S01": {"startCash": 700, "freeFirstCourse": True},
    "S02": {"startCash": 200},
    "S03": {"startCash": 400, "tafeFee": 100},
    "S04": {"startCash": 300, "owns": ["coffee_cart"]},
    "S05": {"startCash": 300, "takeHomeAdjust": -20},
    "S06": {"startCash": 400},
}

def check_effects(cards):
    """Every card has an effect, and every dollar amount in it appears in the card's logic text."""
    def ints(x):
        if isinstance(x, bool): return
        if isinstance(x, int): yield x
        elif isinstance(x, dict):
            for v in x.values(): yield from ints(v)
        elif isinstance(x, list):
            for v in x: yield from ints(v)
    for c in cards:
        assert c["id"] in EFFECTS, f'no effect for {c["id"]}'
        for n in ints(EFFECTS[c["id"]]):
            n = abs(n)
            if n == 0: continue
            assert f'${n}' in c["logic"] or f'${n:,}' in c["logic"], f'{c["id"]}: ${n} not in logic'

SMALL_CARDS = [
    {"id": "G01", "name": "Loan $200", "copies": 20}, {"id": "G02", "name": "Government Bond $200", "copies": 10},
    {"id": "G03", "name": "HECS", "copies": 6}, {"id": "G04", "name": "Bankrupt", "copies": 6},
    {"id": "G05", "name": "Supply Deal", "copies": 6, "level": 3}]

CARD_BACKS = {"news": "K01", "life": "K02", "market": "K03", "policy": "K04", "starting_life": "K05",
              "business": "K06", "job_looking_for_work": "K07", "bank_papers": "K08"}

ASSETS = [
    ("X01", "Board centre art", "Faint background behind the dashboard"),
    ("X02", "Logo", "Home screen, top bar"),
    ("C01-C04", "Corner tiles: Payday, Job Centre, Parliament, Job Cut", "Board ring corners; Payday screen header (C01); Parliament screen (C03)"),
    ("B01-B26", "Business and transport tiles (portrait 5:8)", "Board ring spaces; buy screen"),
    ("A01-A07", "Action tiles: Life, Market, Open Day, Tax Time, Super Fund, Power, Water", "Board ring spaces"),
    ("D01-D28", "Business cards (deeds)", "Tap a business to see it; owned businesses in player panels"),
    ("J01-J18", "Job cards", "Player panels, job picker"),
    ("K01-K08", "Card backs", "Deck buttons; K07 = looking for work"),
    ("N01-N24, L01-L20, M01-M16, P01-P16, S01-S06", "Action cards", "Card pickers and result screens"),
    ("G01-G05", "Loan, Bond, HECS, Bankrupt, Supply Deal", "Counters in player panels and Treasury"),
    ("PP1-PP5", "Public Project tiles", "Treasury panel (built = full colour, not built = faded)"),
    ("Q01-Q05", "Banknotes $10, $20, $50, $100, $500", "Note helper on every money instruction"),
    ("T01-T06", "Player pieces", "Player avatars and tokens on the board ring"),
    ("E01-E05", "Economy states", "Economy track"),
    ("I01-I03", "Prices, Wages, Interest", "Level 2 tracks"),
    ("I04", "Treasury", "Treasury panel and money arrows"),
    ("I05", "Laws", "Laws panel (Level 2)"),
    ("I06", "Bank", "Money arrows"),
    ("I07", "Extra Site marker", "Pips on owned businesses"),
    ("I08", "Study token", "Player panel while studying or bankrupt"),
    ("I09", "Super", "Player panel Super amount"),
    ("MAT", "Player mat", "Visual reference for the Payday screen layout"),
]

def write_json():
    all_cards = NEWS + LIFE + MARKET + POLICY + STARTING
    check_effects(all_cards)
    for c in all_cards:
        c["effect"] = EFFECTS[c["id"]]
    data = {"economy": ECONOMY, "industries": INDUSTRIES, "linkedIndustries": LINKED_INDUSTRIES, "businesses": BUSINESSES,
            "spaces": SPACES, "jobLevels": JOB_LEVELS, "jobs": JOBS, "tracks": TRACKS, "projects": PROJECTS,
            "constants": CONSTANTS, "cards": {"news": NEWS, "life": LIFE, "market": MARKET, "policy": POLICY, "startingLife": STARTING},
            "smallCards": SMALL_CARDS, "cardBacks": CARD_BACKS,
            "startingLifeDeck": ["S01", "S02", "S03", "S04", "S05", "S06", "S06", "S06"]}
    (HERE / 'game-data.json').write_text(json.dumps(data, indent=2, ensure_ascii=False))

def md_table(headers, rows):
    out = ['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join('---' for _ in headers) + ' |']
    for r in rows:
        out.append('| ' + ' | '.join(str(x) for x in r) + ' |')
    return '\n'.join(out)

def money(v):
    if v is None: return ''
    return f'-${-v}' if v < 0 else f'${v}'

def tables():
    t = {}
    t['SPACES'] = md_table(['Pos', 'Tile', 'Space', 'Kind', 'Side'],
                           [[s['pos'], s['tile'], s['label'], s['kind'], s['side']] for s in SPACES])
    rows = []
    for b in BUSINESSES:
        ind = INDUSTRIES[b['industry']]
        if b['customerPrices']:
            land = ' / '.join(money(b['customerPrices'][k]) for k in ['budget', 'standard', 'premium', 'monopoly'])
        elif ind['kind'] == 'employer':
            land = f"owner pays lander {money(ind['shiftPay'])} ({money(ind['shiftPayIfOwnsAll'])} if owns all)"
        elif ind['kind'] == 'transport':
            land = 'lander pays owner $20 x transport owned'
        else:
            land = '$20 bill (Treasury, or owner if sold)'
        rows.append([b['tile'], b['deed'], b['name'], ind['name'], money(b['price']) or 'not for sale', land,
                     ' / '.join(money(b['profit'][e['key']]) for e in ECONOMY), money(b['extraSiteCost']) or 'none'])
    t['BUSINESSES'] = md_table(['Tile', 'Deed', 'Business', 'Industry', 'Buy', 'Landing (Budget / Standard / Premium / Monopoly)',
                                'Profit R / SL / ST / G / B', 'Extra Site'], rows)
    t['JOBS'] = md_table(['Card', 'Job', 'Level'], [[j['card'], j['name'], j['level']] for j in JOBS])
    def cards_table(cs, econ=False):
        if econ:
            return md_table(['ID', 'Title', 'Economy', 'Level 2', 'Logic'],
                            [[c['id'], c['title'], f"{c['economy']:+d}" if c['economy'] else '0',
                              ', '.join(f'{k} +{v}' for k, v in c.get('level2', {}).items()), c['logic']] for c in cs])
        return md_table(['ID', 'Title', 'Logic'], [[c['id'], c['title'] + (' (KEEP)' if c.get('keep') else ''), c['logic']] for c in cs])
    t['NEWS'] = cards_table(NEWS, True)
    t['LIFE'] = cards_table(LIFE)
    t['MARKET'] = cards_table(MARKET)
    t['POLICY'] = cards_table(POLICY)
    t['STARTING'] = cards_table(STARTING)
    t['ASSETS'] = md_table(['IDs', 'What', 'Use in the app'], ASSETS)
    return t

if __name__ == '__main__':
    write_json()
    t = tables()
    tmpl = (HERE / 'SPEC.template.md').read_text()
    for k, v in t.items():
        tmpl = tmpl.replace('{{' + k + '}}', v)
    assert '{{' not in tmpl, 'unfilled placeholder'
    (HERE / 'SPEC.md').write_text(tmpl)
    n = len(NEWS) + len(LIFE) + len(MARKET) + len(POLICY) + len(STARTING)
    print('cards', n, 'businesses', len(BUSINESSES), 'spaces', len(SPACES), 'jobs', len(JOBS))
