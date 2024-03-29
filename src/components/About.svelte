
<!-- ############################################## -->
<!-- HTML -->
<div class="container">
  <div class="content">
    <h3>About the NSCF Georeferencing Tool</h3>
    <p>The NSCF georeferencing tool is designed to aid the process of producing high quality georeferences 
      for museum and herbarium specimen records in a quick, efficient and enjoyable way. It makes georeferences 
      reusable so that when a specimen locality has been georeferenced that georeference can be applied to
      another specimen from the same locality, even if the locality is spelled or formatted differently. 
      The tool also facilitates teamwork for georeferencing a set of specimen records, and enforces 
      <a href="https://dwc.tdwg.org/terms/#dwc:georeferencedBy" target="_blank">the Darwin Core standard set of metadata terms</a> 
      for georeferences.
    </p>
    <h4>How to use this tool</h4>
    <p>The first step is to generate a dataset of specimen records from a museum or 
      herbarium database with Darwin Core terms for field headings, in CSV format, and upload the dataset into the tool. 
      Datasets can be up to 10s of thousands of records, depending on the size of your team and time 
      you want to take to work on the dataset. It is recommended to provide reasonably sized datasets that
      can be completed in a month or two to keep momentum and motivation in the team. Required fields are 
      <a href="https://dwc.tdwg.org/terms/#dwc:scientificName" target="_blank"><em>dwc:scientificName</em></a>, 
      <a href="https://dwc.tdwg.org/terms/#dwc:country" target="_blank"><em>dwc:country</em></a>, 
      <a href="https://dwc.tdwg.org/terms/#dwc:locality" target="_blank"><em>dwc:locality</em></a> or 
      <a href="https://dwc.tdwg.org/terms/#dwc:verbatimLocality" target="_blank"><em>dwc:verbatimLocality</em></a>, 
      and a field that uniquely identifies rows in the dataset such as 
      <a href="https://dwc.tdwg.org/terms/#dwc:occurrenceID" target="_blank"><em>dwc:occurrenceID</em></a>, 
      <a href="https://dwc.tdwg.org/terms/#dwc:catalogNumber" target="_blank"><em>dwc:catalogNumber</em></a> 
      (if unique in the dataset) or an equivalent. 
      <a href="https://dwc.tdwg.org/terms/#dwc:stateProvince" target="_blank"><em>dwc:stateProvince</em></a>
      is recommended to facilitate the georeferencing process, and 
      <a href="https://dwc.tdwg.org/terms/#dwc:recordedBy" target="_blank"><em>dwc:recordedBy</em></a> can be 
      included to refine localities further.
    </p>
    <p><strong>For assistance with preparing and uploading a dataset please contact the NSCF on 
      <a href="mailto:data@nscf.org.za">data@nscf.org.za</a>.</strong></p>
    <p>When the dataset is uploaded into the tool the included fields are checked, owner details provided, and similar 
      localities grouped. The dataset owner can invite team members to assist with georeferencing at this stage.</p>
    <p>
      The dataset is then ready for georeferencing. The georeferencing process involves creating or using 
      existing georeferences and 'tying' or 'linking' those to the localities from the dataset. Users should
      have an appropriate set of georeferencing tools at hand, inluding GIS and appropriate data layers, Geolocate, 
      and so on, for generating new georeferences. Localities from the dataset are presented in groups of 
      similar or the same locality with the numbers of associated specimen records indicated. The process is then as follows:
    </p>
    <ol>
      <li>The user selects one or more locality strings from the group</li>
      <li>An existing, appropriate georeference is selected or a new one is created</li>
      <li>The user applies the selected georeference to the selected locality strings</li>
    </ol>
    <p>Team members work through the dataset until all locality groups have been processed. 
      Locality groups can be skipped or bookmarked to return to later.
    </p>
    <p class="warning">Please take care when georeferencing to use existing georeferences 
      if they match your locality strings. DON'T JUST CREATE NEW GEOREFERENCES! The purpose of this 
      tool is to make georeferencing efficient by minimizing duplication.
    </p>
    <p>For NSCF partner institutions we recommend the use of the georeferencing protocol in the 
      <a href="https://nscf.org.za/resources/collections-management/" target="_blank">Collections Management Manual</a> or
      <a href="https://bit.ly/georefprotocol" target="_blank">available here</a>. Remember that your georeferences will be used by
      others so take care to make sure that new georeferences are accurate, include uncertainty measures that 
      are consistent with your protocol, and add remarks explaining why you chose particular coordinates and 
      uncertainty for a locality where others might need to know that when using your georeferences.
    </p>
    <p>When the dataset is completed the owner and/or designated 'admins' can validate the georeferences by
      checking that the coordinates and uncertainties are correct, that 
      georeferences are correctly linked to localities in the dataset, and that all metadata fields have 
      been completed. An additional validation step includes checking for geographic or environmental outliers.
    </p>
    <p>After validation the dataset can be downloaded again with all georeference data included for incorporation back 
      into the institution database. It is recommended to review the downloaded dataset with a tool such as 
      <a href="https://openrefine.org/" target="blank">OpenRefine</a> before updating the main database.
    </p>
    <p>A training video demonstrating use of the tool is available at this link (to come)</p>
    <h4>Data policy</h4>
    <p>Datasets uploaded to the georeferencing tool are considered property of the data owner
      and will not be used or accessed by SANBI, the NSCF Hub team, or any of the NSCF partner institutions 
      without express written permission from the owner of the dataset. 
    </p>
    <p>Conversely, georeferences created with this tool, meaning geographic coordinates for a locality string with all supporting
      metadata fields, will be publicly accessible and free from any intellectual property restrictions or terms of use. 
      This is in the spirit of free and open data access, and is required for reuse of those georeferences by other parties 
      facilitating efficient georeferencing. Note though
      that attribution is maintained for a georeference by means of the dwc:georeferencedBy and dwc:georeferencedByID terms
      to indicate who generated the georeference. Georeferences are not linked to specimen records outside of a dataset, 
      i.e. it is not possible for anyone to see what specimens, collectors, or datasets are associated with a 
      georeference, except a dataset owner where that georeference has been used. 
    </p>
    <p>We hope that you will enjoy using the tool. For any further assistance please contact <a href="mailto:data@nscf.org.za">data@nscf.org.za</a>.</p>
  </div>
</div>

<!-- ############################################## -->
<style>

  em {
    font-style:normal;
    text-decoration: underline;
  }

  .warning {
    background-color: #ffd47d;
    font-weight: bolder;
    color: rgb(73, 93, 158);
    border-radius: 2px;
    border-width: 20px;
    border: 4px solid #c98f18;
  }
  .container {
    font-size:1.1em;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    height:100%;
    overflow-y: auto;
  }
  .content {
    max-width: 900px;
    text-align: left;
  }
</style>