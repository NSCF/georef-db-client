<script>
  let x = 0
</script>

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
      <em>dwc:scientificName</em>, <em>dwc:country</em>, <em>dwc:locality</em>, and a field that uniquely identifies rows in the dataset 
      such as <em>dwc:occurrenceID</em>, <em>dwc:catalogNumber</em> (if unique in the dataset) or an equivalent. <em>dwc:stateProvince</em>
      is recommended to facilitate the georeferencing process, and <em>dwc:recordedBy</em> can be included to refine localities further.
    </p>
    <p>Next the dataset is uploaded into the tool, fields are checked, owner details provided, and similar 
      localities grouped. The dataset owner can invite team members to assist with georeferencing at this stage.</p>
    <p>
      The dataset is then ready for georeferencing. The georeferencing process involves creating or using 
      existing georeferences and 'tying' or 'linking' those to the locality strings from the dataset. Users should
      have an appropriate set of georeferencing tools at hand, inluding GIS and appropriate data layers, Geolocate, 
      and so on, for generating new georeferences. Localities from the dataset are presented in groups of 
      similar or the same locality with the numbers of associated specimen records indicated. The user selects one 
      or more locality strings from the group; an existing, appropriate georeference is selected or a new one is created; 
      then the user applies the selected georeference to the selected locality strings. Team members work 
      through the dataset until all locality groups have been processed. Locality groups can be skipped or bookmarked 
      to return to later.
    </p>
    <p>For NSCF partner institutions we recommend the use of the georeferencing protocol in the 
      <a href="https://nscf.org.za/resources/collections-management/" target="_blank">Collections Management Manual</a> or
      <a href="https://bit.ly/georefprotocol" target="_blank">available here</a>. Remember that your georeferences will be used by
      others so take care to make sure that new georeferences are of high quality.
    </p>
    <p>When the dataset is completed the owner and/or designated 'admins' can validate the georeferences by
      checking that the coordinates and uncertainties are correct for the a locality string, that 
      georeferences are correctly linked to localities in the dataset, and that all metadata fields have 
      been completed. An additional validation step is to check for geographic or environmental outliers.
    </p>
    <p>Finally the dataset is downloaded again with all georeference data included for incorporation back 
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
      metadata fields, will be publicly accessible and free from any restrictions or terms of use. This is needed
      to allow reuse of those georeferences by other parties and thus facilitate efficient georeferencing. Note though
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
  .container {
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