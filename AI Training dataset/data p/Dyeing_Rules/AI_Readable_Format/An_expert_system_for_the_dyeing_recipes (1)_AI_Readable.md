# AI-Readable Knowledge Extract: An_expert_system_for_the_dyeing_recipes (1).pdf

**Category:** Dyeing_Rules
**Source File:** `An_expert_system_for_the_dyeing_recipes (1).pdf`

## Extracted Document Content

--- Page 1 ---
Journal of Intelligent Manufacturing (2000) 11, 145±155
An expert system for the dyeing recipes
determination
R . CO N V E R T, L . S C H AC H E R and P. V I A L L I E R
Laboratoire de Physique et de MeÂcanique Textiles - Ecole Nationale SupeÂrieure des Industries
Textiles de Mulhouse - 11, rue Alfred Werner - 68093 Mulhouse Cedex France
This article deals with the modelization of the reasoning of an expert in dyeing. The dyeing operation
is one of the latest stage in the whole textile process which alters the intrinsic properties of the
articles. At present, there are expert systems for dyeing industries. Most of them have been developed
by dyes and chemical auxiliary suppliers, and these tools are not widely used in dyeing factories. This
paper describes the dyeing operation, and the rules of the expert in dyeing. The objects that he
reasons about, his reasoning, and the critical points that he considers are also presented.
Keywords: Textile, expert system, dyeing, color
1. Introduction
Textile wet processing is very complex and diverse. It
is carried out in multiple stages, and obtaining the
desired color is just one simple step in the whole
textile process.
During the reasoning of an expert in dyeing, many
criteria are taken into account, and most of these
criteria are subjective and very dif®cult to represent
because they are related to color appreciation, and
hand of textile evaluation. Most of the time, only a
few people in the factory are able to solve the
problems so that the knowledge belongs to a little part
of the staff.
For these reasons, expert systems should be a high
improvement. First, they can take the place of the
expert when absent, and second, they permit the
knowledge of the factory to be kept.
2. The textile ®nishing process
Dyeing, printing and ®nishing are the latest stages, in
the textile process, that alter the intrinsic properties of
textile materials, before they are handled or reas-
sembled into ®nal products.
A schematic representation of the whole process is
given on Fig. 1. It consists in:
* a preparation operation. It could be often split
into a scouring and a desizing operation, which
remove the natural and acquired impurities from
®bres, and into a bleaching operation,
* a coloring operation (dyeing and/or printing)
using dyes or pigments as coloring agents. The
desired color can be achieved by combining
dyestuffs,
* a ®nishing operation to give speci®c properties
to the material according to the clients' require-
ments: water-, oil repellent, crease resistance,
etc. This operation is performed after the
dyeing/printing operation and should not alter
the shade.
In each step, many parameters have to be considered.
So, even for specialists it is time-consuming and it
requires a lot of knowledge.
The process of specifying color usually involves
sending out physical standards to the dyehouse, that
will dye out several samples accordingly and submit
them to approval. The approved sample is then used as
a guideline for bulk production. Color being a
subjective perception, objectivity is of a great
0956-5515 # 2000
Kluwer Academic Publishers

--- Page 2 ---
importance. So, in the textile industry, the use of
computer color matching is rather well established.
The software are based on re¯ectance spectra,
measured with a spectrophotometer, using speci®c
equations. Numerical values can be calculated which
permit the sample to be placed in a three-dimensional
color order system known as ``color space''. Such
values enable color to be objectively compared using
color difference formula (McDonald, 1997).
The calculation of a recipe of dyes is time
consuming. So to restrict the number of possible
recipes according to the requirements, a selection of
dyes and processes has to be done by the dyer.
3. The existing expert systems
Many experts systems exist in the dyeing and
®nishing industry. Most of them have been developed
by chemical products and dyestuffs suppliers (at the
end of 80th and in the early of 90th). For example:
* PreÂ-matic (GuÈnther, 1989) (CIBA): used for the
bleaching of cotton fabrics.
* WOOLY (Frei, 1991) (SANDOZ): related to the
determination of dyeing recipes for wool and
polyamide/wool articles. The selection of dyes
and dyeing processes is done by considering
color fastness criteria, machines used, etc.
* BAFAREX (Lang, 1992) (BASF): developed for
the determination of dyeing recipes for cotton
and polyester/cotton articles, using vat and
disperse dyes.
* OPTIMIST (RuÈttiger, 1988) (BASF): used for
the optimization of dyeing processes.
* TEXPERTO
(Frei,
1992)
(SANDOZ):
this
expert system ful®ls ®nishing recipes.
Another expert system, also developed by SANDOZ,
is used for the selection of ¯uorescent whiteners
(Aspland, 1991).
These expert systems are often related to a speci®c
®eld and only take the dyes and chemical products
sold by these suppliers into account. So, it is an
ef®cient tool for the technicians from these companies
when they have to advice their clients. Unfortunately,
they are not widely used in dyeing factories, because
these factories often combined dyes and auxiliaries
products from several suppliers.
So, an ef®cient expert system should be a tool, in
which each factory could implement its own knowl-
edge ®tting the decision makers and the technical
engineers.
4. The determination of a dyeing recipe
A ``recipe of dyes'' consists in one or many dyes, the
quantity of each dyes (i.e., the quantity of product that
should be used at the beginning of the dyeing) and the
application process.
A ``dyeing recipe'' corresponds to a recipe of dyes,
and indicates all the parameters of the dyeing process,
such as the temperature, the volume of water, the
quantity of each chemical auxiliary product, etc.
The determination of a dyeing recipe takes place in
three main steps, as it is shown on Fig. 2.
The ®rst step consists in selecting of the dyestuffs
and of the dyeing process(es) that may be used to
calculate the recipes of dyes. These selection is done
by the dyer, by taking into account the client
requirements.
The second step is the calculation of the recipes of
dyes from the previously selected objects. This
calculation is done from calibration range of dyes. A
calibration range consists in dyeing an article, using a
speci®c process and with several concentrations of
dyes. Computers provide a mean of testing alternative
dye combinations to ®nd the optimum mixture that
Fig. 1. The dyeing/®nishing process.
146
Convert, Schacher and Viallier

--- Page 3 ---
will give minimum cost and/or color difference
relative to the target. The number of recipes to be
predicted rises very rapidly as the number of possible
dye is increased. Then, it is very important to
eliminate as soon as possible, all the objects that
will not permit the requirements to be ful®lled.
Moreover, in the case of articles made of several
®bers, such as cotton/polyester articles, a recipe of
dyes has to be calculated for cotton ®bers, and an
other one for the polyester ®bres.
In the third step, the ``best'' calculated recipe of
dyes is selected. The complete dyeing recipe is
determined. Then a sample is dyed and if the dyed
sample has the desired color and if the client
requirements are ful®lled, this dyeing recipe is
accepted for the production. If the desired color is
not obtained, then the recipe of dyes has to be
modi®ed (i.e. the concentration of each dyes), until
the color difference between the target and the match
sample is negligible. Finally, if the care requirements
are not achieved by the dyeing recipe (for instance,
the washing fastness is too low), then the dyer must
choose an other recipe of dyes. Whenever there is
some dif®culties with all the calculated recipes of
dyes, it means that the factory cannot ful®l the client
speci®cations due to dyes or processes.
At present, there are tools that permit the recipes of
dyes to be calculated (using the Kubelka-Munck's
relationship) (McDonald, 1997). There are also some
tools that are used for determining the dyeing recipes,
considering the recipe of dyes (dyeing process and
dyes used). This is done by rules de®ned for each
process, such as:
If
the concentration of dyes is lower than 5 g/l
Then the concentration of sodium chloride is equal
to 20 g/l
So, the main dif®culty is related to the ®rst step.
Usually some selection from the list of possible dye is
made by the expert in dyeing before computation
begins. Our work mainly consists in the modelization
of this reasoning. At the end of this step, all the dyes
that may not permit to ful®l the requirements should
have been eliminated.
Fig. 2. Process of determination of a dyeing recipe.
Dyeing recipes determination
147

--- Page 4 ---
5. The clients requirements
The client's requirements may have several aspects.
Nevertheless, it always consists in, at least:
* the article to be dyed (structure, composition,
etc.),
* the desired color,
* the quantity of the article to be dyed.
Some other criteria may still be speci®ed, such as:
* the color fastness requirements,
* the delivery time,
* the dimensional variations accepted, etc.
Most of these speci®cations depend on the end use of
the textile materials. For example, if it is a furnishing
item, then the dyed fabric must have a high fastness to
light, whereas the fastness to washing is not so
important.
6. The color fastness of a dyed fabric
This criterium is used to evaluate the behaviour of a
dyed fabric to a speci®c test. The method currently
used for assessments of fastness test results relies on
comparing the contrast between tested and untested
samples with those of the relevant one of inter-
nationnaly agreed physical scales, each consisting of
pairs of grey chips having graded contrasts as it is
shown on Fig. 3.
This is a visual evaluation, so it is very subjective,
and for the same sample, it is possible to have a
difference between the evaluations done by several
observers, equals to 1 or 2 points (McDonald, 1997).
Moreover, most of the time, whatever the fastness
test, the color fastness is not constant. It will vary with
the concentration of dye on the fabric, and then with
the concentration applied at the beginning of the
dyeing.
7. The general process of reasoning of an expert in
dyeing
The dyeing ®eld is quali®ed of ``opened'' because the
dyer must adapt his reasoning when new dyes, new
processes are used. It is also quali®ed of ``non-
structured'', because most of the time there is no
evident way to obtain a solution.
The expert in dyeing often combined many kinds of
knowledge to carry out the expertise. Then, the
knowledge of a dyer is made of:
* Deep knowledge, which is the basic knowledge
on the objects manipulated. It consists in
relations between these objects and in rules
issued from these relations. This is usually
encyclopedical knowledge.
* Heuristic knowledge, gained from practical
experiences, which consists in new relations
between objects which do not have obvious
directs links. It closely depends on the expert
himself and on the factory.
* Meta-knowledge that governs the global process
of reasoning, allowing to manipulate both deep
and heuristic knowledge.
Fig. 3. Evaluation of the color fastnessÐcase of the change in color related to a grey scale for the change in color.
148
Convert, Schacher and Viallier

--- Page 5 ---
8. The deep knowledge: the objects that are
involved
In the ®nishing ®eld, three main groups of objects are
involved. These objects are represented on Fig. 4,
using the semantic net method (a node represents a
class of objects, and an arrow, the relation between
two classes of objects).
These main groups of data are:
* the ARTICLES,
* the DYES,
* the PROCESSES.
8.1. The articles
A textile material is de®ned by several parameters:
) the ®bre(s) it is made of, and the proportion of
each ®bre,
) its nature (yarn, woven-, non woven- or knitting
fabric, . . .),
) its physical properties such as the breaking
strength, etc.
Items sharing many characteristics are distributing
into sub-groups of articles. Then, a sub-group of
articles is de®ned as an collection of articles that are
composed of the same ®bres, and which have the same
mechanical and physical properties, so that they can
be dyed with the same machines. A group of articles is
composed of sub-groups of articles made of the same
®bres. Then, it is related to one or several ®bres,
whereas a sub-group of articles is related to only one
group of articles, and an article is related to only one
sub group of articles. Finally, one of the characteristic
of a sub group of articles is the machine that can be
used to dye them.
8.2. The dyes
The dyes are chemical compounds characterized by
the chemical reactions that are involved when applied
on a textile material (covalent bound, Van der Waals
bound, etc.), and by the ®bres they can color. That is
why the dyestuffs are distributed into classes of dyes.
Then, each dye is related to only one class of dyes.
Nevertheless, even if dyes are related to the same class
Fig. 4. Representation of the objects using the semantic net methodÐdeep knowledge.
Dyeing recipes determination
149

--- Page 6 ---
of dyes, they cannot necessarily be applied together,
because they have not all the same chemical proper-
ties nor the same af®nity for the ®bres. These are also
distributed into groups of dyes. Then, a group of dyes
is made of dyes that are applied with the same
processes.
So, a dye can be related to several group of dyes,
whereas it is a part of only one class of dyes. The
properties of dyes can be held with a range of dyes. A
range of dyes consists in applying this dye, on the
same article, with the same process and for several
concentrations, as it is shown on Fig. 6. Then, for each
concentration, the measurement of the color (in the
form of re¯ectance spectra) will be used for the
calculation of the recipe of dyes.
Moreover, each dye has fastness properties (to
washing, to light, . . .). These properties depend on the
dye, on the article, and especially of the ®bers it is
made and on the dyeing process.
8.3. The processes
A dyeing process is de®ned by:
* the successive machines that are used,
* the class(es) of dyes that is(are) applied,
* some parameters (temperature, volume of water,
duration of the treatment, etc.) and auxiliary
products that are attached to each part of
machine.
In the example presented on Fig. 7, we considered a
dyeing process for cotton/polyester articles. Two
dyeing machines are successively used: the autoclave,
for the dyeing of polyester ®bres with disperse dyes,
and Pad-Batch for the dyeing of cotton ®bres with
reactive dyes. The order of uses of these machines is
crucial given that disperse dyes are applied in an acid
medium and that some reactive dyes may be sensible
to acid.
9. The deep knowledge: the causality connections
between the objects
The reasoning of the expert in dyeing consists in
eliminating all the objects that cannot ful®l clients
requirements. The rules involved for this reasoning
are issued from the causality connections between
objects given by the semantic net (Fig. 4). Two kinds
of rules are then used:
Fig. 5. Representation of the objects using the semantic net method Ð heuristic knowledge
150
Convert, Schacher and Viallier

--- Page 7 ---
* ``direct'' elimination rules, that bring on the one
hand a client requirement, and on the other hand
elements of the semantic net (class of dyes,
machine, etc.) into play. For example:
If
A class of dyes cannot be used for at least
one of the ®bers that must be dyed
Then
This class of dyes is unavailable for the
case studied
* ``indirect'' elimination rules, that bring on the
one hand an object from the semantic net,
unavailable for the reasoning, and on the other
hand elements from the semantic net, that are
linked to this object (class of dyes, machine, etc)
into play. All these rules are summarised in
Table 1. For example:
Fig. 7. A dyeing processÐthe example of the dyeing of polyester/cotton articles.
Fig. 6. A range of C.I. Reactive Blue 19 (concentration applied in %).
Dyeing recipes determination
151

--- Page 8 ---
If
A group of dyes belongs to a class of dyes
which is not available for the case studied
Then
This group of dyes is unavailable for the
case studied
So, during the reasoning, the parameters of the
client
requirements
are
successively
taken
into
account. For each criterium, all the objects that are
not compatible are eliminated.
Nevertheless, even with these connections, we
often obtain more than one available dyeing process,
and many dyes, so that the calculation of recipes of
dyes is still time consuming. The dyer often uses an
other kind of knowledge.
10. The heuristical knowledge
The heuristic knowledge is the result of many years of
experience, and permits to the dyer to reason more
rapidly on the case to be treated. It consists of new
relations between objects and new rules issued from
these relations. These new relations are shown on
Fig. 5.
10.1. The color
The color is a characteristic of each dye. This color
depends on the dye concentration, on the fabric, and
on the dyeing process. Theoretically, with the primary
color (i.e., magenta, cyan and blue) plus black and
white, it is possible to obtain all the desired colors.
Unfortunately, most of the time there is not such
combination of dyes in groups of dyes. Nevertheless,
for each group of dyes, the dyer often determines a
``trichromy''. It consists of 3 or 4 dyes which permit
to obtain 70±80% of the desired colors. In the 20±30%
other cases, the dyer has to combine other dyes with
the dyes of the trichromy. It often corresponds to color
like the turkish blue, etc.
From this point, it is easy to understand that for
each group of dyes, and sometimes for some classes of
dyes, it is not possible to obtain all the colors. The
color is then de®ned with terms such as dull/bright
and pastel/clear/medium/dark, and the dyer use some
rules such as :
If
the desired color is bright
Then
the class of sulphur dyes is not available
These colorimetrical terms can be well-de®ned
using the 3 dimension colorimetrical space. For
example, the loci of dull dyes is a cylinder with an
elliptical section (Schacher, 1991).
10.2. The color fastness
This criteria are related to the chemical properties of
each dyes. So, they depend on:
* the dyes, and especially the way it is ®xed on the
®bres,
* the ®bres,
* the applications process.
Table 1. The causality connections between the objects
Object
Cause of elimination
Class of dyes
This class of dyes cannot be used to dye at least one of the ®bre that composed the article
All the groups of dyes which are related to this class of dyes are unavailable
All the dyeing processes that are used to applied this class of dyes are unavailable
Group of dyes
The class of dyes, that this group of dyes is related to, is unavailable
All the dyes, in that group, are unavailable
All the dyeing processes that could be used to applied that group of dyes have been eliminated
Dye
All the group of dyes, that this dye belong to, are unavailable
At least one of the color fastness requirements cannot be ful®lled with this dye
Process
At least one of the class of dyes that the process can apply is unavailable
All the group of dyes, that may be applied with this process, have been eliminated
At least one of the machine that is used, in this dyeing process, is not available
Machine
This machine cannot be used for the treatment of the sub-group of articles,
All the dyeing processes that used this machine are unavailable.
152
Convert, Schacher and Viallier

--- Page 9 ---
Given that the color fastness is strongly related to the
chemical ®xation process, it is possible to de®ned
some behaviour for classes of dyes or groups of dyes.
For example, most of the direct dyes cannot be used to
obtain good fastness to washing at 40C. Then,
concerning this fastness, it is possible to attribute a
grade to the class of direct dyes.
Nevertheless, in some cases, such as the color
fastness to arti®cial light, this property depends on
each dyes. Then it is dif®cult to de®ne a color fastness
to a class or a group of dyes.
Whatever the fastness requirement, it has to be
veri®ed that the ``match sample'' ful®ls it. The
veri®cation could be experimentally done by submit-
ting the dyed sample to the fastness test. Besides, it
exits algorithms that permit to evaluate the color
fastness of a calculated recipe of dyes, taking into
account the dyeing process, and the properties of each
dyes (Convert, 1997).
10.3. The dyeing properties of dyestuffs
As it is shown on Fig. 5, the link between the dyes and
the article is due to the relation between the class of
dyes and the ®bres, and indirectly to the relation
between the machine and the sub-group of articles.
Using this relation, it is theoretically possible to dye
all the articles that are composed of at least one of the
®bres which are characteristic for the class of dyes.
For example, for the dyeing of cotton, reactive dyes
are often used. They cannot be used for the dyeing of
polyester ®bers. Nevertheless, some of them still
present a low af®nity for polyester ®bres, so that they
can colored them a little. Then, such dyes cannot be
used for the dyeing of cotton/polyester ®bers.
11. The meta knowledge: the general process of
reasoning
The typical process of reasoning is presented on Fig.
8. The dyer always reasons in the same way. At the
beginning of the reasoning, all the objects from the
factory are supposed to be able to ful®l the client's
requirements. The selection criteria are then ordered
following their importance. Each step of the reasoning
corresponds to one selection criterium, and to the
elimination of the objects that cannot ful®l this
criterium.
Some criteria are always considered, such as :
* the ®bres that must be dyed,
* the dyeing processes that can treat the mix of
®bres,
* the machine available for the article to be
treated,
* the desired color,
* the quantity of article to be dyed,
* the dyes that can dye the mix of ®bers,
* the reproducibility/the price.
All these criteria are considered in this order. Other
criteria, that are speci®ed in the client requirements are
more or less important, so that a weight can be
attributed to each of them. These criteria will then be
successively considered, eventually after the three ®rst
criteria previously exposed (®bers to be dyed, process
for the mix of ®bers, machine available for this article).
If, after considering all the criteria, no dye or
process is available, it means that the dyeing factory
cannot treat the article.
At the end of this step, several dyes will be
proposed to the dyer, and at least one dyeing process.
Then, the possible recipe of dyes will be calculated
using the color matching software.
12. Example
An example of reasoning is the following. It is carried
out from client's requirements that are:
article: Polyester / Cotton 65/35 twill
color: dark blue L  60; a  ÿ40; b  12
quantity to be treated: 1000 m
washing fastness at 60CÐdegradation: 4
washing fastness at 60CÐstaining: 4
fastness to arti®cial light: 4
This article may have some defects of ``barrel''.
Moreover, this article is very fragile, so that it cannot
be dyed with over¯ow. The sub-group of articles that
it belongs to, is characterized by three dyeing
machines: jigger, autoclave and pad-batch.
The dyeing factory studied often used around 230
dyestuffs. The reasoning then consists in:
* ordering the selection criteria, following their
importance,
* taking successively the selection criteria into
account, on a purpose to eliminate the objects
that cannot ful®l these criteria.
The reasoning is given in Table 2. At the beginning,
the 230 dyes are available, and the 4 dyeing machines
Dyeing recipes determination
153

--- Page 10 ---
(autoclave, jigger, over¯ow and pad-batch). Both
cotton and polyester ®bers must be dyed to obtain the
same deep blue color.
At the end of the selection a recipe of dyes must be
calculated for cotton ®bers and polyester ®bers. Most
of the time, the dyes recipes consists of three dyes.
Then, we obtain:
* 10 recipes of dyes possible for the 5 disperse
dyes,
* 84 recipes of dyes possible for the 9 reactive
dyes.
Then, the dyer selects the ``best'' recipe for cotton
and the ``best'' recipe for the polyester.
Fig. 8. The general process of reasoning.
154
Convert, Schacher and Viallier

--- Page 11 ---
13. Conclusion
The modelization of the reasoning of an expert in
dyeing is possible. The major problems are related to
very subjective criteria that are considered during the
work of the expert.
The model that we have proposed, developed in
collaboration with a dyeing factory, uses a representa-
tion of the expertise world in a semantic net form with
relations between objects established from deep
knowledge but also integrating heuristic rules and
factual data. It also has an exhaustive check list of all
the criteria that have to be taken into account and is
linked with a computer color matching system to be
able to provide a high level of expertise in textile wet
processing. Based on this study, it is proposed to
develop interactive multimedia and hyper media
training tools.
This model has been tested on several cases that
were presented to the expert. Each time, the results
were closed to the results of the dyer (Convert, 1998).
Acknowledgments
This work is a part of the EURAM-BRITE II project
``BATEM''. It has been achieved in close collabora-
tion with the Institut Textile de France (Direction
ReÂgionale de Mulhouse), and with the dyeing factory
Mathelin S.A. (Lyon).
References
Aspland, J. R., Davis, J. S. and Waldrop, T. A. (1991) An
expert system for selection of ¯uorescent whiteners.
Textile Chemist and Colourist, 23(9), 74±76.
Convert,
R.,
Schacher,
L.
and
Viallier,
P.
(1997)
Development of a method to predict the color fastness
of a dyeing fabric. The Fiber SocietyÐSpring 1997
Joint Conference, Mulhouse, France, 345±346.
Convert, R. (1998) Contribution au deÂveloppment d'un
systeÁme expert pour la formulation des recettes de
teinture.
Thesis,
UniversiteÂ
de
Haute
Alsace,
Mulhouse, France
Frei, G. and Waliser, R. (1991) WOOLYÐan expert system
for the wool dyer. The Journal of the Society of Dyers
and Colorists, 107(4), 147±149.
Frei, G. and Poppenwinner, K. (1992) TEXPERTOÐein
Expertensystem fuÈr die AusruÈstung. Textilveredlung,
27(9), 276±279.
GuÈnther, R. (1989) PreÂparation du coton en pieÁces- un
systeÁme expert. L'Industrie Textile, 1197, 78±80.
Lange,
A.,
Nahr,
U.
and
SchuÈrmann,
K.
(1992)
BAFAREXÐein Expertensystem fuÈr die Farbstoff
applikation. Textilveredlung, 27(9), 268±275.
McDonald, R. (1997) Colour physics for industryÐ2nd
Edition.
The
Society
of
Dyers
and
Colourists,
Bradford, England.
RuÈttiger,
W.
(1988)
ExpertensystemeÐdas
kuÈnftige
Instrument technischer FuÈhrungskraÈfte-Teil 3: das
textile Expertensystem OPTIMIST: Funktionsweise,
Abgrenzung und Ausblick. Textilveredlung, 23(6),
199±203.
Schacher, L. (1991) Contribution aÁ la modeÂlisation du
raisonement de l'expert ennoblisseur de coton aÁ la
continue.
Thesis,
UniversiteÂ
de
Haute
Alsace,
Mulhouse, France.
Table 2. Example of reasoning
Step
Criterium
Objects available
1
Polyester/Cotton
3 classes of dyes, 9 groups of dyes, 56 dyes 16 processes, 4 machines
2
Process for the dyeing of cotton and polyester
3 classes of dyes, 9 groups of dyes, 56 dyes 9 processes, 4 machines
3
Machine available
3 classes of dyes, 8 groups of dyes, 53 dyes 4 processes, 3 machines
4
Defect possible: barres
3 classes of dyes, 4 groups of dyes, 32 dyes 4 processes, 3 machines
5
Fastness to washing at 60C Ð degradation: 4
2 classes of dyes, 2 groups of dyes, 23 dyes 2 processes, 3 machines
6
Fastness to washing at 60C Ð staining: 4
ÐÐÐÐÐ
7
Fastness to arti®cial light: 5
2 classes of dyes, 2 groups of dyes, 21 dyes 2 processes, 3 machines
8
Color
ÐÐÐÐÐ
9
Quantity
ÐÐÐÐÐ
10
Dyes available for mixes of cotton and polyester
2 classes of dyes, 2 groups of dyes, 14 dyes 2 processes, 3 machines
11
Reproducibility/Price
2 classes of dyes: reactive dyes for cotton and disperse dyes for polyester
2 groups of dyes: 9 reactive dyes and 5 disperse dyes
Dyeing recipes determination
155