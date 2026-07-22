<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="MyProject.aspx.cs" Inherits="MyProject" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        function openQrModal() {
            $('#reminderModal').modal('show');
        }
        function openPayModal() {
            $('#AdministrativeChargesModal').modal('show');
        } 
        function openPayMessageModal() {
            $('#paymentMessage').modal('show');
        }
        function openStripePayMessageModal() {
            $('#stripePaymentMessage').modal('show');
        }
        function ShowAddItemModal() {
            $('#AddItemModal').modal('show');
        }
        function CloseAddItemModal() {
            debugger;
            document.getElementById("AddItemModal").style.display = "none";
            document.getElementById("AddItemModal").classList.add("fade")
        }

    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <!-- Preference slider module start -->
    <div class="content-wrapper hnm-prefer hnm-r-mt-6 hnm-r-mb-5">
        <div class="hnm-prefer__inner grey-box">
            <div class="hnm-prefer__title-sec">
                <h2 class="grey-box__title">Select your preference</h2>
                <asp:LinkButton ID="lnkAddRooms" runat="server" CssClass="hnm-button hnm-button--secondary" OnClick="lnkAddRooms_Click">ADD ROOMS</asp:LinkButton>
            </div>

            <!-- Prefer slider start -->
            <div class="hnm-prefer__slider">
                <asp:Repeater runat="server" ID="rptRoomPreferences">
                    <ItemTemplate>
                        <div class='<%# Eval("RoomDivClass") %>'>
                            <div class="hnm-icon-round">
                                <img src='<%# Eval("ImageURL") %>' class="hnm-icon-round__img" />
                                <p class="hnm-icon-round__text"><%# Eval("RoomName") %></p>
                            </div>
                            <asp:LinkButton ID="lnkDeleteRoom" runat="server" CssClass="hnm-room-tile__close" Style="display: block; z-index: 1;" OnClick="lnkDeleteRoom_Click" CommandArgument='<%# Eval("RoomPreferenceID") %>'>
                                            <img src="../assets/images/close-icon-grey-round.svg" alt=""></asp:LinkButton>
                        </div>
                    </ItemTemplate>
                </asp:Repeater>
            </div>
            <div class="hnm-prefer__flex-between">
                <div class="hnm-total-box">
                    <div class="hnm-total-box__txt">TOTAL</div>
                    <div class="hnm-total-box__amount">$<asp:Label ID="lblTotalAmount" runat="server"></asp:Label></div>
                </div>
                <asp:LinkButton ID="lnkProceedOnTop" runat="server" CssClass="hnm-button hnm-button--secondary" OnClick="btnProceedToCheckOut_Click">PROCEED TO CHECKOUT</asp:LinkButton>
            </div>
        </div>
    </div>
    <!-- Preference slider module end -->

    <!-- My Project Start -->
    <div class="hnm-my-project content-wrapper hnm-r-mb-5">
        <div class="hnm-head-with-total hnm-head-with-total--edit">
            <h2 class="hnm-sub-head">My Project</h2>
            <asp:LinkButton ID="lnkEditAddress" runat="server" Text="EDIT" CssClass="hnm-button" OnClick="lnkEditAddress_Click"></asp:LinkButton>
        </div>
        <div class="hnm-box-head hnm-box-head--two-col mb-4">
            <div class="hnm-box-head__inner">
                <h3 class="hnm-box-head__title">Site address
                </h3>
                <div class="hnm-box-head__cnt">
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblSiteAddressName" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblSiteAddressMobile" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblSiteAddress1" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblSiteAddressState" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblSiteAddressCountry" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblSiteAddressPostalCode" runat="server"></asp:Label>
                    </p>
                </div>
            </div>
            <div class="hnm-box-head__inner">
                <h3 class="hnm-box-head__title">Billing address
                </h3>
                <div class="hnm-box-head__cnt">
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblBillingAddressName" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblBillingAddressMobile" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblBillingAddress1" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblBillingAddressState" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblBillingAddressCountry" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__addrs">
                        <asp:Label ID="lblBillingAddressPostalCode" runat="server"></asp:Label>
                    </p>
                </div>
            </div>
        </div>
        <div class="hnm-box-head hnm-box-head--two-col">
            <div class="hnm-box-head__inner">
                <h3 class="hnm-box-head__title">Property Details</h3>
                <div class="hnm-box-head__cnt">
                    <p class="hnm-my-project__property-label">Property type :</p>
                    <p class="hnm-my-project__property-txt">
                        <asp:Label ID="lblPropertyType" runat="server"></asp:Label>
                    </p>
                    <p class="hnm-my-project__property-label">Flat type :</p>
                    <p class="hnm-my-project__property-txt">
                        <asp:Label ID="lblFlatType" runat="server"></asp:Label>
                    </p>
                </div>
            </div>
            <div class="hnm-box-head__inner">
                <h3 class="hnm-box-head__title">Documents uploaded</h3>
                <div class="hnm-box-head__cnt">
                    <div class="hnm-my-project__doc-box" id="DivFloorPlanForm" runat="server">
                        <asp:Label ID="lblFloorPlanForm" runat="server"></asp:Label>
                        <asp:Image ID="ImgFloorPlanForm" runat="server" />
                    </div>
                    <div class="hnm-my-project__doc-box" id="DivPermitForm" runat="server">
                        <asp:Label ID="lblPermitForm" runat="server"></asp:Label>
                        <asp:Image ID="ImgPermitForm" runat="server" />
                    </div>
                    <div class="hnm-my-project__doc-box" id="DivIndemnityForm" runat="server">
                        <asp:Label ID="lblIndemnityForm" runat="server"></asp:Label>
                        <asp:Image ID="ImgIndemnityForm" runat="server" />
                    </div>
                    <asp:LinkButton ID="lnkUploadDocuments" runat="server" CssClass="hnm-button hnm-button--secondary" OnClick="lnkUploadDocuments_Click">UPLOAD PENDING DOCUMENTS</asp:LinkButton>

                    <!-- Upload documents Popup Start -->
                    <div class="modal fade hnm-modal hnm-modal--upload-docs" id="uploadPendingModal" tabindex="-1" aria-hidden="true" runat="server">
                        <div class="modal-dialog  modal-dialog-centered">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Upload pending documents</h5>
                                    <asp:LinkButton ID="lnkClosePopUp" runat="server" CssClass="close" OnClick="lnkClosePopUp_Click"><span aria-hidden="true">&times;</span></asp:LinkButton>
                                </div>
                                <div class="modal-body">
                                    <div class="hnm-modal__upload-box">
                                        <p class="hnm-modal__desc">Upload Floor Plan:</p>
                                        <p class="hnm-modal__text-grey">Please upload the renovation permit (PDF, JPG or PNG). Image can be a maximum of 16 MB in size</p>
                                        <div class="hnm-uploadfiletext" id="DivDwldFloorPlan" runat="server">
                                            <asp:Label ID="lblFloorPlanFile" runat="server"></asp:Label>
                                            <asp:LinkButton ID="lnkDwnldFloorPlan" runat="server" OnClick="lnkDwnldFloorPlan_Click">Download</asp:LinkButton>
                                        </div>
                                        <div class="hnm-file">
                                            <asp:FileUpload ID="FloorPlanUpload" runat="server" class="hnm-file__input" />
                                            <p class="hnm-file__txt"></p>
                                            <label for="ContentPlaceHolder1_FloorPlanUpload" class="hnm-button">Browse</label>
                                        </div>
                                        <asp:RegularExpressionValidator ID="ReqFloorUpload" runat="server" ErrorMessage="Only PNG,JPG,PDF file is allowed!"
                                            ValidationExpression="(.*png$)|(.*jpg$)|(.*jpeg$)|(.*pdf)"
                                            SetFocusOnError="true" ControlToValidate="FloorPlanUpload" ValidationGroup="Page" ForeColor="Red"
                                            Font-Size="X-Small" Display="Dynamic"> </asp:RegularExpressionValidator>
                                    </div>
                                    <div class="hnm-modal__upload-box">
                                        <p class="hnm-modal__desc">Upload renovation permit:</p>
                                        <p class="hnm-modal__text-grey">Please upload the renovation permit (PDF, JPG or PNG). Image can be a maximum of 16 MB in size</p>
                                        <div class="hnm-uploadfiletext" id="DivDwldPermit" runat="server">
                                            <asp:Label ID="lblRenovationPermitFile" runat="server"></asp:Label>
                                            <asp:LinkButton ID="lnkDwnldPermit" runat="server" OnClick="lnkDwnldPermit_Click">Download</asp:LinkButton>
                                        </div>
                                        <div class="hnm-file">
                                            <asp:FileUpload ID="RenovationPermitUpload" runat="server" class="hnm-file__input" />
                                            <p class="hnm-file__txt"></p>
                                            <label for="ContentPlaceHolder1_RenovationPermitUpload" class="hnm-button">Browse</label>
                                        </div>
                                        <asp:RegularExpressionValidator ID="ReqRenovationPermit" runat="server" ErrorMessage="Only PNG,JPG,PDF file is allowed!"
                                            ValidationExpression="(.*png$)|(.*jpg$)|(.*jpeg$)|(.*pdf)"
                                            SetFocusOnError="true" ControlToValidate="RenovationPermitUpload" ValidationGroup="Page" ForeColor="Red"
                                            Font-Size="X-Small" Display="Dynamic"> </asp:RegularExpressionValidator>
                                    </div>
                                    <div class="hnm-modal__upload-box">
                                        <p class="hnm-modal__desc">Upload Indemnity:</p>
                                        <p class="hnm-modal__text-grey">Please upload the renovation permit (PDF, JPG or PNG). Image can be a maximum of 16 MB in size</p>
                                        <div class="hnm-uploadfiletext" id="DivDwldIndemnity" runat="server">
                                            <asp:Label ID="lblIndemnityFile" runat="server"></asp:Label>
                                            <asp:LinkButton ID="lnkDwnldIndemnity" runat="server" OnClick="lnkDwnldIndemnity_Click">Download</asp:LinkButton>
                                        </div>
                                        <div class="hnm-file">
                                            <asp:FileUpload ID="IndemnityFileUpload" runat="server" class="hnm-file__input" />
                                            <p class="hnm-file__txt"></p>
                                            <label for="ContentPlaceHolder1_IndemnityFileUpload" class="hnm-button">Browse</label>
                                        </div>
                                        <asp:RegularExpressionValidator ID="ReqIndemnityFileUpload" runat="server" ErrorMessage="Only PNG,JPG,PDF file is allowed!"
                                            ValidationExpression="(.*png$)|(.*jpg$)|(.*jpeg$)|(.*pdf)"
                                            SetFocusOnError="true" ControlToValidate="IndemnityFileUpload" ValidationGroup="Page" ForeColor="Red"
                                            Font-Size="X-Small" Display="Dynamic"> </asp:RegularExpressionValidator>
                                    </div>
                                    <div class="hnm-modal__btn">
                                        <asp:Button ID="btnCancelFiles" runat="server" Text="Cancel" CssClass="hnm-button hnm-button--secondary" OnClick="btnCancelFiles_Click" />
                                        <asp:Button ID="btnSaveFiles" runat="server" Text="Save" CssClass="hnm-button" OnClick="btnSaveFiles_Click" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Upload documents Popup End -->
                </div>
            </div>
        </div>
    </div>
    <!-- My Project End -->

    <!-- Project Details Start -->
    <div class="hnm-project-detail content-wrapper hnm-r-pb-6">
        <div class="hnm-head-with-total hnm-head-with-total--edit" id="divProjectDetailsEdit" runat="server">
            <h2 class="hnm-sub-head">Project Details</h2>
            <asp:LinkButton ID="lnkEditRoomDetails" runat="server" Text="EDIT" CssClass="hnm-button" OnClick="lnkEditRoomDetails_Click"></asp:LinkButton>
        </div>
        <div class="hnm-project-detail__box" id="divProjectDetails" runat="server">
            <div class="hnm-project-detail__head">
                <div class="hnm-project-detail__col-1">Room Details</div>
            </div>
            <asp:Repeater runat="server" ID="rptRoomDetails">
                <ItemTemplate>
                    <div class="hnm-project-detail__row">
                        <div class="hnm-project-detail__col-1">
                            <h3 class="hnm-project-detail__item-head"><%# Eval("RoomName") %></h3>
                            <span class="hnm-project-detail__cost">$<%# Eval("RoomCost") %>
                            </span>
                            <asp:Label ID="lblRoomPreferenceID" runat="server" Text='<%# Eval("RoomPreferenceID") %>' Visible="false"></asp:Label>
                        </div>
                        <div id="divWithWholeApartment" runat="server" visible='<%# Convert.ToBoolean(Convert.ToInt32(Eval("WholeApartmentVisible"))) %>' width="100%">
                            <dx:ASPxGridView ID="GridWholeApartmentRoomScopes" runat="server" ClientInstanceName="GridWholeApartmentRoomScopes" Width="100%" KeyFieldName="ScopeID"
                                EnableCallBacks="false" DataSourceID="dsWholeApartmentRoomScopes" CssClass="table-fontsize">
                                <SettingsAdaptivity AdaptivityMode="Off" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                                <Columns>
                                    <dx:GridViewDataTextColumn FieldName="ScopeID" VisibleIndex="1" CellStyle-HorizontalAlign="Center" Visible="false">
                                    </dx:GridViewDataTextColumn>
                                    <dx:GridViewDataTextColumn FieldName="ItemName" VisibleIndex="2" EditFormSettings-Visible="False" Caption="Tasks" Width="760px">
                                    </dx:GridViewDataTextColumn>
                                    <dx:GridViewDataTextColumn FieldName="ScopeCost" VisibleIndex="3" EditFormSettings-Visible="False" Caption="Cost" Width="300px">
                                    </dx:GridViewDataTextColumn>
                                    <dx:GridViewDataColumn Caption="#" AdaptivePriority="0" VisibleIndex="7">
                                        <DataItemTemplate>
                                            <asp:LinkButton ID="lnkWHRemoveItem" runat="server" CssClass="hnm-button" OnClick="lnkWHRemoveItem_Click"
                                                CommandArgument='<% #Bind("Scopes_In_Project_WApartmentID")%>' CausesValidation="false">Remove</asp:LinkButton>
                                        </DataItemTemplate>
                                    </dx:GridViewDataColumn>
                                </Columns>
                            </dx:ASPxGridView>
                            <asp:SqlDataSource ID="dsWholeApartmentRoomScopes" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                SelectCommand="GetAllScopesForWholeApartments @RoomPreferenceID">
                                <SelectParameters>
                                    <asp:ControlParameter ControlID="lblRoomPreferenceID" Name="RoomPreferenceID" />
                                </SelectParameters>
                            </asp:SqlDataSource>
                        </div>
                        <div id="divWithOutWholeApartment" runat="server" visible='<%# !Convert.ToBoolean(Convert.ToInt32(Eval("WholeApartmentVisible"))) %>'>
                            <dx:ASPxGridView ID="GridRoomScopes" runat="server" ClientInstanceName="GridRoomScopes" Width="100%" KeyFieldName="ScopeID"
                                EnableCallBacks="false" DataSourceID="RoomScopesSource" OnDetailRowExpandedChanged="GridRoomScopes_DetailRowExpandedChanged"
                                OnBeforePerformDataSelect="GridRoomScopes_BeforePerformDataSelect" OnPageIndexChanged="GridRoomScopes_PageIndexChanged" CssClass="table-fontsize">
                                <SettingsAdaptivity AdaptivityMode="Off" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                                <Columns>
                                    <dx:GridViewDataTextColumn FieldName="ScopeID" VisibleIndex="1" CellStyle-HorizontalAlign="Center" Visible="false">
                                    </dx:GridViewDataTextColumn>
                                    <dx:GridViewDataTextColumn FieldName="Scope" VisibleIndex="2" EditFormSettings-Visible="False" Caption="Tasks" Width="760px">
                                    </dx:GridViewDataTextColumn>
                                    <dx:GridViewDataTextColumn FieldName="ScopeCost" VisibleIndex="3" EditFormSettings-Visible="False" Caption="Cost" Width="400px">
                                    </dx:GridViewDataTextColumn>
                                </Columns>
                                <Templates>
                                    <DetailRow>
                                        <dx:ASPxGridView ID="GridRoomOptions" runat="server" ClientInstanceName="GridRoomOptions" Width="100%" EnableCallBacks="false"
                                            SettingsText-EmptyDataRow="No orders have been made yet" DataSourceID="RoomOptionSource" KeyFieldName="Scopes_in_ProjectRoomID"
                                            OnBeforePerformDataSelect="GridRoomOptions_BeforePerformDataSelect" CssClass="table-fontsize small">
                                            <ClientSideEvents Init="function(s, e) { s.SetVisible(s.GetVisibleRowsOnPage() != 0);  }" />
                                            <SettingsAdaptivity AdaptivityMode="HideDataCellsWindowLimit"></SettingsAdaptivity>
                                            <Columns>
                                                <dx:GridViewBandColumn Caption="Products" HeaderStyle-Font-Bold="true">
                                                    <Columns>
                                                        <dx:GridViewDataTextColumn FieldName="Items" VisibleIndex="1" EditFormSettings-Visible="False" PropertiesTextEdit-EncodeHtml="false">
                                                        </dx:GridViewDataTextColumn>
                                                        <dx:GridViewDataTextColumn FieldName="Length" VisibleIndex="2" EditFormSettings-Visible="False">
                                                        </dx:GridViewDataTextColumn>
                                                        <dx:GridViewDataTextColumn FieldName="Width" VisibleIndex="3" EditFormSettings-Visible="False">
                                                        </dx:GridViewDataTextColumn>
                                                        <dx:GridViewDataTextColumn FieldName="Quantity" VisibleIndex="4" EditFormSettings-Visible="False">
                                                        </dx:GridViewDataTextColumn>
                                                        <dx:GridViewDataTextColumn FieldName="Area" VisibleIndex="5" EditFormSettings-Visible="False">
                                                        </dx:GridViewDataTextColumn>
                                                        <dx:GridViewDataTextColumn FieldName="Cost" VisibleIndex="6" EditFormSettings-Visible="False">
                                                        </dx:GridViewDataTextColumn>
                                                        <dx:GridViewDataColumn Caption="#" AdaptivePriority="0" VisibleIndex="7">
                                                            <DataItemTemplate>
                                                                <asp:LinkButton ID="lnkRemoveItem" runat="server" CssClass="hnm-button" OnClick="lnkRemoveItem_Click"
                                                                    CommandArgument='<% #Bind("Scopes_in_ProjectRoomID")%>' CausesValidation="false">Remove</asp:LinkButton>
                                                            </DataItemTemplate>
                                                        </dx:GridViewDataColumn>
                                                    </Columns>
                                                </dx:GridViewBandColumn>
                                            </Columns>
                                            <Settings ShowFooter="True" />
                                        </dx:ASPxGridView>
                                    </DetailRow>
                                </Templates>
                                <SettingsDetail ShowDetailRow="true" AllowOnlyOneMasterRowExpanded="true" />
                                <Settings ShowFilterRow="false" />
                            </dx:ASPxGridView>
                            <asp:SqlDataSource ID="RoomScopesSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                SelectCommand="GetAllScopesForPreferredRooms @RoomPreferenceID">
                                <SelectParameters>
                                    <asp:ControlParameter ControlID="lblRoomPreferenceID" Name="RoomPreferenceID" />
                                </SelectParameters>
                            </asp:SqlDataSource>
                            <asp:SqlDataSource ID="RoomOptionSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                SelectCommand="GetAllOptionLevelsForPreferredRooms @RoomPreferenceID, @ScopeID">
                                <SelectParameters>
                                    <asp:ControlParameter ControlID="lblRoomPreferenceID" Name="RoomPreferenceID" />
                                    <asp:SessionParameter SessionField="ScopeID" Name="ScopeID" Type="Int32" />
                                </SelectParameters>
                            </asp:SqlDataSource>
                        </div>
                    </div>
                </ItemTemplate>
            </asp:Repeater>
        </div>
        <div class="hnm-amout-box">
            <h3 class="hnm-amout-box__text">Renovation Cost : </h3>
            <div class="hnm-amout-box__cost">$<asp:Label ID="lblRenovationCost" runat="server"></asp:Label></div>
        </div>
        <asp:Repeater ID="rptProjectFees" runat="server">
            <ItemTemplate>
                <div class="hnm-amout-box">
                    <h3 class="hnm-amout-box__text"><%# Eval("FeeText") %></h3>
                    <div class="hnm-amout-box__cost">$<%# Tools.FormatMoneyWithDecimal(Convert.ToString(Eval("Amount"))) %></div>
                </div>
            </ItemTemplate>
        </asp:Repeater>
        <div class="hnm-amout-box">
            <h3 class="hnm-amout-box__text">Total overall project cost : </h3>
            <div class="hnm-amout-box__cost">$<asp:Label ID="lblTotalProjectCost" runat="server"></asp:Label></div>
        </div>
        <div class="hnm-amout-box">
            <h3 class="hnm-amout-box__text">Total Payable (10% of the renovation cost) : </h3>
            <div class="hnm-amout-box__cost">$<asp:Label ID="lblTotalPayable" runat="server"></asp:Label></div>
        </div>
        <div class="hnm-amout-box hnm-amout-box--wrap">
            <h3 class="hnm-amout-box__text">Payment Method</h3>
            <div class="hnm-amout-box__radio-sec">
                <div class="hnm-radio-btn">
                    <label id="lblPayPal" runat="server" visible="false">
                        <asp:RadioButton runat="server" ID="rdoPaypal" ClientIDMode="Static" GroupName="radio-group" />
                        <span class="hnm-radio-btn__radio"></span>
                        Paypal
                    </label>
                </div>
                <div class="hnm-radio-btn">
                    <label>
                        <asp:RadioButton runat="server" ID="rdoStripe" ClientIDMode="Static" GroupName="radio-group" />
                        <span class="hnm-radio-btn__radio"></span>
                        Stripe
                    </label>
                </div>
                <div class="hnm-radio-btn">
                    <label>
                        <asp:RadioButton runat="server" ID="rdoPayNow" ClientIDMode="Static" GroupName="radio-group" />
                        <span class="hnm-radio-btn__radio"></span>
                        Pay Now
                    </label>
                </div>
            </div>
        </div>
        <div class="hnm-project-detail__btn-sec">
            <a href="#" title="PRINT" class="hnm-button" style="display: none">
                <svg viewBox="0 0 542 542" class="hnm-button__icon" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 352.21C0 303.66 0 255.12 0 206.57C0.34 205.89 0.83 205.23 0.98 204.51C1.79 200.57 2.47 196.6 3.29 192.66C3.55 191.39 3.99 190.15 4.49 188.95C5.4 186.78 6.3 184.59 7.41 182.52C9.59 178.47 11.54 174.23 14.26 170.56C17.54 166.13 21.36 162.06 25.23 158.12C28.01 155.29 31.04 152.6 34.34 150.44C38.34 147.82 42.66 145.64 47.02 143.63C50.6 141.98 54.41 140.81 58.15 139.52C59.63 139.01 61.18 138.67 62.72 138.4C66.62 137.72 70.52 136.79 74.45 136.58C80.31 136.26 86.2 136.47 92.07 136.46C92.74 136.46 93.42 136.46 94.24 136.46C94.24 135.43 94.24 134.67 94.24 133.92C94.24 114.95 94.18 95.98 94.31 77.01C94.34 72.9 94.99 68.79 95.46 64.69C95.65 63.01 96 61.32 96.5 59.7C97.41 56.74 98.44 53.82 99.49 50.91C100.25 48.81 100.97 46.68 101.97 44.7C103.07 42.52 104.43 40.48 105.75 38.42C107.4 35.84 108.91 33.14 110.84 30.79C113.61 27.43 116.57 24.2 119.73 21.2C122.54 18.53 125.59 16.06 128.78 13.87C132 11.65 135.5 9.76 139 7.92C141.63 6.54 144.36 5.28 147.17 4.35C150.31 3.31 153.58 2.68 156.81 1.92C161.48 0.82 166.18 0 171.03 0C237.59 0.03 304.14 0 370.7 0.07C374.86 0.07 379.01 0.83 383.17 1.24C383.36 1.26 383.55 1.31 383.73 1.37C386.9 2.3 390.08 3.19 393.23 4.18C395.65 4.94 398.14 5.61 400.39 6.73C404.03 8.53 407.52 10.62 411.04 12.65C416.33 15.72 420.88 19.76 425.1 24.12C428.2 27.32 431.18 30.73 433.66 34.42C436.32 38.4 438.52 42.73 440.56 47.08C442.16 50.49 443.26 54.13 444.46 57.71C445 59.31 445.34 60.99 445.61 62.66C446.33 67.11 447.49 71.58 447.54 76.05C447.76 95.4 447.64 114.75 447.65 134.11C447.65 134.85 447.65 135.59 447.65 136.47C449.17 136.47 450.43 136.47 451.7 136.47C461.14 136.5 470.64 135.87 479.87 138.58C484.8 140.03 489.84 141.25 494.55 143.26C499.11 145.2 503.54 147.67 507.58 150.54C511.8 153.54 515.57 157.19 519.36 160.75C524.06 165.17 527.82 170.43 531.05 175.96C533.3 179.82 535.05 184.03 536.61 188.23C538.21 192.53 539.64 196.96 540.56 201.45C541.37 205.41 541.68 209.52 541.7 213.57C541.82 232.22 541.78 250.87 541.77 269.52C541.77 295.07 541.75 320.62 541.72 346.16C541.72 347.94 541.64 349.74 541.37 351.5C540.92 354.35 540.29 357.17 539.71 359.99C539.28 362.13 539.08 364.36 538.32 366.37C536.83 370.35 535.08 374.25 533.32 378.13C531.18 382.87 528.41 387.27 525.15 391.3C520.47 397.07 515.52 402.57 509.18 406.64C506.8 408.16 504.72 410.19 502.24 411.49C498.28 413.57 494.19 415.46 490 417.01C485.7 418.61 481.28 420.04 476.8 420.94C472.72 421.76 468.48 421.88 464.3 422.1C460.86 422.28 457.4 422.15 453.95 422.16C451.92 422.16 449.9 422.16 447.66 422.16C447.66 423.11 447.66 423.87 447.66 424.62C447.65 448.7 447.68 472.78 447.57 496.86C447.56 499.71 446.82 502.56 446.42 505.42C446.41 505.48 446.39 505.55 446.37 505.6C445.05 508.82 443.96 512.15 442.35 515.21C440.61 518.53 438.65 521.81 436.32 524.74C432.02 530.17 426.51 534.24 420.25 537.19C416.44 538.98 412.5 540.44 408.22 540.84C405.52 541.09 402.84 541.56 400.15 541.93C314.04 541.93 227.93 541.93 141.82 541.93C141.64 541.88 141.45 541.78 141.27 541.77C135.78 541.6 130.48 540.55 125.3 538.64C121.58 537.27 118.12 535.5 114.85 533.27C108.75 529.1 103.9 523.8 100.3 517.35C98.47 514.07 96.83 510.72 96.16 506.97C95.52 503.38 94.36 499.79 94.34 496.2C94.17 472.38 94.24 448.56 94.23 424.74C94.23 423.94 94.23 423.14 94.23 422.16C92.47 422.16 91.01 422.17 89.55 422.16C81.53 422.12 73.49 422.49 65.53 421.08C65.15 421.01 64.77 421 64.4 420.9C60.92 419.93 57.39 419.09 53.99 417.92C50.74 416.8 47.58 415.4 44.47 413.96C42.37 412.99 40.37 411.79 38.41 410.56C35.81 408.93 33.17 407.32 30.76 405.44C24.83 400.82 19.58 395.47 15.18 389.38C12.78 386.06 10.51 382.57 8.69 378.91C6.85 375.21 5.64 371.2 4.12 367.34C2.47 363.18 1.36 358.9 1.01 354.42C0.92 353.66 0.34 352.95 0 352.21ZM94.11 337.59C91.31 337.59 88.69 337.51 86.08 337.61C82.93 337.73 80.1 336.98 77.26 335.55C72.48 333.14 69.99 329.11 68.99 324.22C68.01 319.43 69.5 314.96 72.72 311.32C76.05 307.56 80.31 305.78 85.48 305.78C209.08 305.83 332.68 305.81 456.29 305.86C458.19 305.86 460.12 306.37 462 306.79C465.07 307.48 467.56 309.21 469.39 311.71C471.64 314.78 473.35 318.14 472.95 322.11C472.76 324.01 472.51 326.02 471.75 327.74C469.08 333.76 464.05 337.09 457.86 337.55C454.52 337.8 451.14 337.59 447.73 337.59C447.73 355.33 447.73 372.8 447.73 390.49C452.21 390.49 456.61 390.64 460.99 390.45C465.15 390.27 469.29 389.72 473.44 389.33C473.63 389.31 473.82 389.29 474 389.22C477.15 387.92 480.28 386.55 483.46 385.31C487.12 383.87 490.19 381.55 493.14 379.06C498.24 374.77 502.41 369.75 505.01 363.54C506.35 360.35 508.05 357.22 508.78 353.88C509.66 349.9 510.01 345.73 510.01 341.65C510.09 300.96 510.08 260.28 510.03 219.59C510.02 215.81 510.24 212.06 509.25 208.23C508.49 205.31 507.92 202.34 506.94 199.44C505.34 194.68 502.9 190.39 499.83 186.51C496.28 182.02 491.99 178.35 487.07 175.27C482.78 172.59 478.23 170.72 473.45 169.56C469.68 168.64 465.69 168.32 461.79 168.32C334.55 168.26 207.3 168.26 80.06 168.31C77.18 168.31 74.3 168.91 71.42 169.19C67.59 169.57 64.06 170.83 60.5 172.29C56.66 173.87 53.11 175.87 49.94 178.47C45.5 182.12 41.64 186.25 38.65 191.31C36.04 195.72 34.18 200.33 32.94 205.2C31.79 209.71 31.71 214.35 31.72 219.02C31.78 258.3 31.79 297.58 31.72 336.87C31.71 344.5 31.73 352.07 34.82 359.23C36.24 362.51 37.41 366.01 39.43 368.89C42.73 373.6 46.61 377.79 51.4 381.24C56.63 385.01 62.33 387.47 68.36 389.22C71.41 390.1 74.71 390.29 77.92 390.42C82.77 390.61 87.63 390.48 92.48 390.48C92.97 390.48 93.47 390.41 94.07 390.37C94.11 372.79 94.11 355.32 94.11 337.59ZM125.91 337.69C125.91 338.67 125.91 339.54 125.91 340.41C125.91 391.06 125.91 441.71 125.91 492.36C125.91 493.45 125.71 494.59 125.99 495.6C126.65 497.97 127.08 500.59 128.42 502.54C131.86 507.54 136.7 510.09 143 510.08C179.41 510 215.82 510.04 252.23 510.04C301.22 510.04 350.22 510.02 399.21 510.08C402.62 510.08 405.74 509.23 408.43 507.45C413.43 504.15 415.89 499.37 415.88 493.23C415.83 442.07 415.85 390.91 415.85 339.74C415.85 339.06 415.85 338.38 415.85 337.67C319.12 337.69 222.63 337.69 125.91 337.69ZM415.86 136.37C415.86 135.51 415.86 134.82 415.86 134.12C415.86 116.3 415.89 98.48 415.83 80.66C415.82 77.58 415.81 74.54 415.07 71.41C414.18 67.7 413.62 63.94 411.75 60.56C409.77 56.99 407.92 53.3 405.58 49.97C402.9 46.15 399.42 42.98 395.54 40.35C393.21 38.77 390.78 37.28 388.23 36.12C385.76 35 383.1 34.23 380.46 33.56C377.6 32.83 374.67 31.91 371.77 31.9C319.71 31.78 267.65 31.79 215.59 31.78C200.39 31.78 185.18 31.81 169.98 31.83C169.15 31.83 168.29 31.78 167.5 31.98C164.05 32.89 160.58 33.77 157.2 34.88C154.86 35.65 152.47 36.52 150.41 37.82C147.27 39.8 144.36 42.16 141.43 44.44C137.56 47.45 134.67 51.35 132.35 55.57C130.42 59.08 128.4 62.62 127.85 66.75C127.34 70.54 126.06 74.29 126.03 78.06C125.83 96.96 125.93 115.87 125.93 134.78C125.93 135.27 126.01 135.77 126.06 136.35C222.63 136.37 319.12 136.37 415.86 136.37Z" />
                    <path d="M110.13 204.25C118.3 204.25 126.47 204.31 134.65 204.23C141.76 204.16 146.99 207.4 149.92 213.64C151.48 216.94 152.11 220.65 150.49 224.59C149.35 227.39 148.13 229.96 145.92 231.92C143.21 234.32 139.96 235.9 136.31 235.92C118.82 236.01 101.32 236.15 83.8301 235.85C77.9901 235.75 73.4201 232.74 70.6401 227.17C69.1901 224.27 68.4601 221.38 68.8901 218.3C69.6301 212.99 72.2901 208.85 77.1301 206.23C79.9701 204.69 82.9601 204.17 86.1901 204.22C94.1701 204.33 102.15 204.25 110.13 204.25Z" />
                    <path d="M270.78 472.96C256.54 472.96 242.3 472.98 228.06 472.95C222 472.93 215.08 468.18 213.67 462C213.21 460 212.63 457.91 212.79 455.92C213.23 450.45 215.88 446.17 220.71 443.4C223.6 441.74 226.72 441.16 230.08 441.17C257.66 441.24 285.25 441.16 312.83 441.25C319.21 441.27 324.11 444.05 327.2 449.92C328.77 452.9 329.57 455.95 329.01 459.16C328.12 464.19 325.63 468.32 320.96 470.85C318.1 472.4 315.09 473.07 311.78 473.04C298.11 472.9 284.44 472.97 270.78 472.96Z" />
                    <path d="M270.79 405.21C256.67 405.21 242.56 405.27 228.44 405.18C221.6 405.14 216.93 401.49 213.91 395.58C212.44 392.71 212.19 389.49 212.88 386.51C213.79 382.57 215.73 379.07 219.28 376.63C222.67 374.29 226.32 373.44 230.4 373.45C257.55 373.52 284.7 373.52 311.85 373.47C318 373.46 323.01 375.56 326.39 380.78C328.95 384.75 329.99 388.92 328.32 393.74C327.02 397.52 325.1 400.53 321.75 402.63C319.24 404.2 316.58 405.24 313.53 405.23C299.28 405.19 285.03 405.21 270.79 405.21Z" />
                </svg>print</a>
            <asp:LinkButton ID="ExportToPdf" runat="server" CssClass="hnm-button" Text="EXPORT TO PDF"  Visible="false">
                <svg viewBox="0 0 549 549" class="hnm-button__icon" xmlns="http://www.w3.org/2000/svg">
                     <path d="M366.246 548.46C261.356 548.46 156.466 548.46 51.5757 548.46C51.0957 548.16 50.6557 547.72 50.1357 547.6C48.2157 547.16 46.2157 547.02 44.3557 546.41C40.0657 545.01 35.6357 543.79 31.6457 541.76C27.8257 539.81 24.3157 537.13 20.9557 534.41C16.6457 530.93 12.8857 526.8 9.89571 522.17C6.96571 517.65 4.5757 512.81 3.0057 507.55C1.4557 502.36 0.235696 497.16 0.0656957 491.74C0.0056957 490.01 0.0357274 488.28 0.0357274 486.54C0.0357274 344.95 0.0357274 203.37 0.0357274 61.7804C0.0357274 59.5104 -0.0843165 57.2404 0.115683 54.9904C0.385684 51.9804 0.575723 48.9104 1.40572 46.0304C2.92572 40.7104 4.45571 35.3404 7.51571 30.6204C9.47571 27.5804 11.2457 24.3804 13.5357 21.6004C17.6457 16.6004 22.4657 12.3004 28.0157 8.92043C30.6957 7.29043 33.4357 5.68043 36.3257 4.49043C38.9557 3.40043 41.7857 2.76043 44.5757 2.16043C48.3357 1.35043 52.1357 0.690428 55.9357 0.140428C57.7057 -0.109572 59.5257 0.050428 61.3257 0.050428C138.416 0.050428 215.516 0.050428 292.606 0.050428C293.406 0.050428 294.206 0.0504278 295.006 0.0604278C298.176 0.0904278 301.156 1.00043 303.526 2.99043C307.376 6.23043 311.036 9.72043 314.626 13.2504C323.306 21.7804 331.916 30.3804 340.516 38.9904C348.216 46.7104 355.806 54.5204 363.516 62.2204C372.216 70.9104 381.016 79.5104 389.736 88.1904C396.916 95.3304 404.026 102.54 411.186 109.7C415.576 114.09 417.936 119.09 417.916 125.58C417.766 176.02 417.836 226.46 417.836 276.89C417.836 277.74 417.836 278.59 417.836 279.37C442.976 279.37 467.906 279.37 493.206 279.37C491.816 277.89 490.776 276.7 489.656 275.6C483.636 269.67 477.576 263.79 471.576 257.84C466.976 253.29 462.396 248.71 457.896 244.06C454.236 240.28 451.626 235.92 452.246 230.42C452.496 228.21 453.356 226.03 454.196 223.94C456.176 218.99 460.446 216.61 465.216 215.6C470.716 214.44 475.676 216.36 479.766 220.23C482.566 222.88 485.286 225.63 488.026 228.34C492.446 232.72 496.866 237.09 501.266 241.5C505.376 245.63 509.436 249.81 513.556 253.93C517.306 257.69 521.116 261.38 524.856 265.14C529.996 270.3 535.106 275.51 540.236 280.69C543.306 283.78 546.586 286.6 547.636 291.22C549.036 297.38 547.966 302.8 543.546 307.33C536.606 314.46 529.526 321.45 522.506 328.5C516.386 334.64 510.276 340.78 504.146 346.9C496.416 354.61 488.716 362.35 480.916 369.99C476.046 374.76 470.656 377.35 463.456 375.12C457.086 373.15 453.746 368.77 452.366 362.84C451.106 357.41 453.016 352.33 456.806 348.43C466.726 338.23 476.916 328.3 486.996 318.26C489.006 316.26 491.006 314.26 493.386 311.88C467.846 311.88 442.926 311.88 417.836 311.88C417.836 312.81 417.836 313.67 417.836 314.52C417.836 363.23 417.956 411.93 417.756 460.64C417.706 473.63 419.116 486.69 416.716 499.62C416.096 502.96 415.506 506.35 414.406 509.55C413.356 512.62 411.856 515.58 410.206 518.38C408.446 521.36 406.426 524.22 404.266 526.93C400.276 531.94 395.546 536.23 390.016 539.48C386.376 541.62 382.566 543.63 378.616 545.08C375.146 546.35 371.356 546.74 367.716 547.58C367.176 547.72 366.726 548.17 366.246 548.46ZM385.716 311.75C384.556 311.75 383.696 311.75 382.836 311.75C347.186 311.75 311.536 311.78 275.886 311.69C273.516 311.68 270.966 311.27 268.826 310.3C264.496 308.34 261.616 304.98 260.096 300.25C258.506 295.31 259.366 290.99 262.086 286.83C265.326 281.87 270.016 279.66 275.866 279.66C311.716 279.67 347.566 279.65 383.416 279.7C385.236 279.7 385.756 279.23 385.756 277.38C385.706 232.14 385.716 186.89 385.716 141.65C385.716 140.94 385.716 140.23 385.716 139.33C384.596 139.33 383.736 139.33 382.886 139.33C353.696 139.33 324.516 139.36 295.326 139.27C292.956 139.26 290.366 138.91 288.256 137.91C281.806 134.83 278.576 129.61 278.586 122.3C278.646 93.1804 278.616 64.0604 278.616 34.9504C278.616 34.1104 278.616 33.2604 278.616 32.2504C277.436 32.2504 276.516 32.2504 275.596 32.2504C204.166 32.2504 132.726 32.2504 61.2957 32.2504C59.8257 32.2504 58.3557 32.2104 56.8957 32.2904C52.6657 32.5304 48.7857 33.9204 45.2057 36.1004C41.9857 38.0604 38.9857 40.2704 37.2057 43.7604C35.9657 46.1904 34.1357 48.4204 33.4457 50.9804C32.5657 54.2504 32.2457 57.7604 32.2357 61.1604C32.1757 203.28 32.1857 345.41 32.1957 487.53C32.1957 489.13 32.0957 490.75 32.3057 492.32C32.5557 494.26 32.8057 496.29 33.5657 498.06C34.6157 500.5 36.1557 502.72 37.4557 505.05C40.4657 510.42 45.5457 513.23 51.0057 515.09C54.2257 516.19 57.8957 516.3 61.3557 516.3C159.446 516.36 257.526 516.34 355.616 516.37C360.186 516.37 364.616 516.09 368.946 514.27C372.506 512.78 375.626 510.78 378.226 508.01C383.626 502.26 385.766 495.36 385.756 487.5C385.676 429.86 385.716 372.23 385.716 314.59C385.716 313.74 385.716 312.88 385.716 311.75ZM310.856 106.86C328.006 106.86 345.066 106.86 361.876 106.86C344.896 89.8504 327.926 72.8504 310.856 55.7504C310.856 72.8104 310.856 89.8004 310.856 106.86Z" />
                     <path d="M171.436 215.391C141.186 215.391 110.926 215.421 80.6759 215.361C73.6359 215.351 68.7259 211.731 65.5759 205.571C64.1359 202.741 63.8459 199.601 64.4959 196.671C65.5759 191.841 68.0059 187.811 72.6959 185.301C75.9959 183.531 79.3759 183.221 82.9559 183.221C142.126 183.241 201.306 183.271 260.476 183.181C265.426 183.171 269.906 184.231 273.436 187.601C275.216 189.301 276.396 191.761 277.436 194.061C278.186 195.731 278.536 197.711 278.546 199.551C278.566 205.761 273.796 212.651 267.346 214.491C264.826 215.211 262.446 215.361 259.986 215.371C230.476 215.411 200.956 215.391 171.436 215.391Z" />
                     <path d="M171.456 408.13C141.146 408.13 110.836 408.09 80.5261 408.16C73.7561 408.17 67.1961 403.27 65.2061 397.07C64.3961 394.54 64.096 392.09 64.486 389.69C65.066 386.08 66.686 382.77 69.546 380.31C72.936 377.4 76.8261 375.99 81.3961 375.99C141.486 376.05 201.576 376.05 261.666 375.99C266.136 375.99 269.976 377.36 273.236 380.25C275.326 382.1 277.086 384.29 277.556 387.23C277.856 389.08 278.676 390.96 278.516 392.76C278.076 397.84 276.066 402.11 271.586 405.12C268.366 407.29 265.026 408.18 261.186 408.17C231.286 408.1 201.376 408.13 171.456 408.13Z" />
                     <path d="M149.965 247.471C173.075 247.471 196.195 247.461 219.305 247.481C226.405 247.491 231.545 250.991 234.415 257.221C235.915 260.471 236.205 264.141 234.965 267.991C233.435 272.761 230.565 275.991 226.305 278.151C224.775 278.931 222.975 279.211 221.265 279.621C220.565 279.781 219.805 279.681 219.075 279.681C173.045 279.681 127.025 279.671 80.9954 279.691C75.8454 279.691 71.5155 277.771 68.2255 273.971C64.9255 270.151 63.3955 265.441 64.5355 260.481C65.7555 255.171 68.9554 250.961 74.1054 248.771C76.1554 247.901 78.5654 247.541 80.8154 247.531C103.865 247.441 126.915 247.471 149.965 247.471Z" />
                     <path d="M149.916 311.75C173.166 311.75 196.416 311.72 219.666 311.77C226.696 311.78 231.766 315.45 234.466 321.61C237.346 328.17 235.586 336.17 228.736 340.85C225.906 342.79 222.936 343.84 219.496 343.84C173.196 343.81 126.896 343.83 80.5857 343.81C73.6257 343.81 68.5957 340.41 65.7257 334.26C63.2757 329.01 63.8757 323.89 67.2657 318.92C70.6457 313.98 75.1857 311.77 80.9557 311.76C103.946 311.73 126.936 311.75 149.916 311.75Z" />
                </svg>EXPORT TO PDF</asp:LinkButton>
            <asp:Button ID="btnProceedToCheckOut" runat="server" CssClass="hnm-button hnm-button--secondary" Text="PROCEED TO CHECKOUT" OnClick="btnProceedToCheckOut_Click" />
            <!-- Popup Start -->
            <div class="modal fade hnm-modal hnm-modal__points" id="AdministrativeChargesModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog  modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Administrative Charges</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="hnm-modal__desc">To complete your renovation work at ease, there will be an administrative Service charge for the following works:</p>
                            <p class="hnm-modal__text-grey"><span class="hnm-modal__text-bold">a)</span> Finalized the homeowner’s selected items.</p>
                            <p class="hnm-modal__text-grey"><span class="hnm-modal__text-bold">b)</span> Finalized paper work for discrepancy check and adjustment.</p>
                            <p class="hnm-modal__text-grey"><span class="hnm-modal__text-bold">c)</span> Finalized paper work for actual measurement.</p>
                            <div class="hnm-modal__btn">
                                <asp:LinkButton ID="lnkAgreedProceed" runat="server" CssClass="hnm-button" OnClick="lnkAgreedProceed_Click">Agree and proceed</asp:LinkButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Popup End -->
            <!--QR Code Popup Start -->
            <div class="modal fade hnm-modal" id="reminderModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog  modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">PAY</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="hnm-modal__desc">Please ensure you have a soft copy of your home floor plan or layout plan with you for document upload upon check out.</p>
                            <ol class="hnm-modal__ul-alphabet">
                                <li>Finalized the homeowner’s selected items</li>
                                <li>Finalized paper work for discrepancy check and adjustment.</li>
                                <li>Finalized paper work for actual measurement. </li>
                            </ol>
                            <div class="hnm-modal__box">
                                <div class="hnm-modal__boxtext">
                                    Order Id :
                                </div>
                                <div class="hnm-modal__box-value">
                                    <asp:Label ID="lblProjectID" runat="server"></asp:Label>
                                </div>
                            </div>
                            <div class="hnm-modal__box">
                                <div class="hnm-modal__boxtext">
                                    Amount to be paid :
                                </div>
                                <div class="hnm-modal__box-value">
                                    $
                                    <asp:Label ID="lblInitialPyamentCost" runat="server"></asp:Label>
                                </div>
                            </div>
                            <div class="hnm-modal__scansec">
                                <img src="../assets/images/qr-img.png" alt="">
                                <p class="hnm-modal__scantext">Scan To Pay</p>
                            </div>
                            <div class="hnm-modal__btn">
                                <asp:LinkButton ID="lnkPaynowProceed" runat="server" CssClass="hnm-button" OnClick="lnkPaynowProceed_Click">Proceed</asp:LinkButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!--QR CodePopup End -->
            <!-- Popup Start -->
            <div class="modal fade hnm-modal hnm-modal__points" id="paymentMessage" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog  modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Pay</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="hnm-modal__desc">Please select the payment method</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal fade hnm-modal hnm-modal__points" id="AddItemModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog  modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">&nbsp;</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="hnm-modal__desc">Rooms are not added. Please add items to proceed</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal fade hnm-modal hnm-modal__points" id="stripePaymentMessage" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog  modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Pay</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="hnm-modal__desc">The maximum amount accepted by Stripe is $10,000.00</p>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Popup End -->
        </div>
    </div>
    <!-- Project Details End -->
</asp:Content>


