# Third-party data and attribution

The insurance master and policy data under `vendor/falk-pfefferminzia` comes
from Falk Uebernickel's “Pfefferminzia – synthetischer Lehr-Datensatz” project.

- Upstream: <https://github.com/falkue/Pfefferminzia>
- Pinned revision: `53a80bf49176a5066b80f0d4d509f096c16f57e7`
- Data and documents: Creative Commons Attribution 4.0 International
- Generator code: MIT

Attribution required by the upstream licence:

> Pfefferminzia – synthetischer Lehr-Datensatz, Falk Uebernickel, CC BY 4.0

The upstream directory is a pinned Git submodule. The application indexes the
upstream tariff sheets directly. Local operational records and mutable
`workshop_*` claim workflow state do not modify the submodule; the latter
references upstream claim IDs but must not be mistaken for imported source
records.

Everything in the upstream project and this workshop extension represents a
fictional company and synthetic teaching data. It contains no real customer or
claim dataset and must not be used for real insurance decisions.
