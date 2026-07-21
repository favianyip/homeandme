<%@ Page Title="" Language="C#" MasterPageFile="~/MasterPage.master" AutoEventWireup="true" CodeFile="CustomizeRoomTest.aspx.cs" Inherits="CustomizeRoomTest" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script>
        function ChangeOptionClass(a) {
            debugger;
            var id = "divOption" + a;
            if (document.getElementById(id))
                document.getElementById(id).classList.add('active');
        }
        function ChangeSubOptionClass(a) {
            debugger;
            var id = "divSubOption" + a;
            if (document.getElementById(id))
                document.getElementById(id).classList.add('active');
        }

        function ChangeSubSubOptionClass(a) {
            debugger;
            var id = "divSubsubOption" + a;
            if (document.getElementById(id))
                document.getElementById(id).classList.add('active');
        }

        function ChangeScopeClass(a) {
            debugger;
            var id = "divScope" + a;
            if (document.getElementById(id))
                document.getElementById(id).classList.add('active');
        }
        function ChangeSubSubOptionL2Class(a) {
            debugger;
            var id = "divSubsubOptionL2" + a;
            if (document.getElementById(id))
                document.getElementById(id).classList.add('active');
        }
        function ChangeSubSubOptionL3Class(a) {
            debugger;
            var id = "divSubSubOptionL3" + a;
            if (document.getElementById(id))
                document.getElementById(id).classList.add('active');
        }
        function ChangeThemeClass(a) {
            debugger;
            var id = "divTheme" + a;
            if (document.getElementById(id))
                document.getElementById(id).classList.add('active');
        }
        function ChangeRenovationClass(a) {
            debugger;
            var b = a;
            if (document.getElementById(b))
                document.getElementById(b).classList.add('Ren-Active');
        }

        function ChangeClass(a, b, c, d, e, f, g, h) {
            debugger;
            //ChangeRoomClass(a);
            if (b != "0")
                ChangeThemeClass(b);
            if (c != "0")
                ChangeScopeClass(c);
            if (d != "0")
                ChangeOptionClass(d);
            if (e != "0")
                ChangeSubSubOptionClass(e);
            if (f != 0)
                ChangeSubOptionClass(f);
            if (g != 0)
                ChangeSubSubOptionL2Class(g);
            if (h != 0)
                ChangeSubSubOptionL3Class(h);
        }

        function ShowAddItemModal() {
            debugger;
            document.getElementById("AddItemModal").style.display = "block";
            document.getElementById("AddItemModal").classList.remove("fade")
        }
        function CloseAddItemModal() {
            debugger;
            document.getElementById("AddItemModal").style.display = "none";
            document.getElementById("AddItemModal").classList.add("fade")
        }
        document.getElementById("ibScope").addEventListener("click", function (event) {
            event.preventDefault()
        });
        function ChangeWHOptionClass(c) {
            debugger;
            var id = "divWHOption" + c;
            if (document.getElementById(id))
                document.getElementById(id).classList.add('active');
        }

        function ChangeWHScopeClass(b) {
            debugger;
            var id = "divWHScope" + b;
            if (document.getElementById(id))
                document.getElementById(id).classList.add('active');
        }

        function ChangeWHClass(a, b, c, ) {
            debugger;
            if (a != "0")
                ChangeThemeClass(a);
            if (b != "0")
                ChangeWHScopeClass(b);
            if (c != "0")
                ChangeWHOptionClass(c);
        }
        function OpenThemeModal() {
            document.getElementById("imgSlider").style.display = "block";
            document.getElementById("imgSlider").classList.add("show");
            document.getElementById("divimgsliderfor").classList.add("open");
            document.getElementById("divimgslidernav").classList.add("open");
            document.getElementById("btnmodalclose").classList.add("open");
            document.getElementById("MasterBody").classList.add("modal-open");
            document.getElementById("divModalBottom").classList.add("show");
        }
        function CloseThemeModal() {
            document.getElementById("imgSlider").style.display = "none";
            document.getElementById("imgSlider").classList.remove("show");
            document.getElementById("divimgsliderfor").classList.remove("open");
            document.getElementById("divimgslidernav").classList.remove("open");
            document.getElementById("btnmodalclose").classList.remove("open");
            document.getElementById("MasterBody").classList.remove("modal-open");
            document.getElementById("divModalBottom").classList.remove("show");
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager runat="server"></asp:ToolkitScriptManager>
    <%--<asp:UpdatePanel ID="upMain" UpdateMode="Always" runat="server">
        <ContentTemplate>--%>
    <div class="content-wrapper hnm-r-pb-5 hnm-r-pt-5">
        <div class="grey-box grey-box--centered">
            <h1 class="hnm-main-head">CUSTOMIZE YOUR ROOMS</h1>
            <p class="grey-box__text">Create your dream bedroom with a range of features to help you. Simply choose your preferred floor, colour, texture and furniture options and add it to your wishlist.</p>
        </div>
    </div>
    <div class="content-wrapper hnm-prefer hnm-r-pb-5">
        <div class="hnm-prefer__inner grey-box">
            <div class="hnm-prefer__title-sec">
                <h2 class="grey-box__title">Select your preference</h2>
                <a class="hnm-button hnm-button--secondary" data-toggle="modal" data-target="#RoomModal" href="javascript:void(0)">ADD ROOMS</a>
            </div>
            <div class="hnm-prefer__slider">
                <asp:Repeater runat="server" ID="rptRoomPreferences">
                    <ItemTemplate>
                        <div class='<%# Eval("RoomDivClass") %> '>
                            <div class="hnm-icon-round">
                                <img src='<%# Convert.ToString(Convert.ToString(Eval("RoomPreferenceID")) == Convert.ToString(Session["RoomPreferenceID"]) ? Eval("ImageUrl2") : Eval("ImageUrl"))  %>' class="hnm-icon-round__img" />
                                <p class="hnm-icon-round__text"><%# Eval("RoomName") %></p>
                            </div>
                            <asp:LinkButton ID="lnkDeleteRoom" runat="server" CssClass="hnm-room-tile__close" Style="display: block; z-index: 1;" OnClick="lnkDeleteRoom_Click" CommandArgument='<%# Eval("RoomPreferenceID") %>'>
                            <img src="../assets/images/close-icon-grey-round.svg" alt=""></asp:LinkButton>
                            <asp:LinkButton ID="lnkActiveRoom" runat="server" OnClick="lnkActiveRoom_Click" Style="position: absolute; inset: 0;" CommandArgument='<%# Eval("RoomPreferenceID") %>' CommandName='<%# Eval("RoomID") %>'>
                            </asp:LinkButton>
                        </div>
                    </ItemTemplate>
                </asp:Repeater>
            </div>
            <div class="hnm-prefer__flex-between">
                <div class="hnm-total-box">
                    <div class="hnm-total-box__txt">TOTAL</div>
                    <div class="hnm-total-box__amount">$<asp:Label ID="lblTotalAmount" runat="server"></asp:Label></div>
                </div>
                <asp:Button ID="btnProceed" runat="server" CssClass="hnm-button hnm-button--secondary" Text="PROCEED TO CHECKOUT" OnClick="btnProceed_Click" />
            </div>
            <!-- Room Popup Start -->
            <div class="modal fade hnm-modal" id="RoomModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Rooms</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <asp:DropDownList ID="drpRoomType" runat="server" CssClass="hnm-modal__desc" DataSourceID="RoomTypeSource"
                                DataTextField="RoomName" DataValueField="RoomID">
                            </asp:DropDownList>
                            <asp:SqlDataSource ID="RoomTypeSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                SelectCommand="SELECT RoomID, RoomName FROM Rooms WHERE IsActive = 1"></asp:SqlDataSource>
                            <div class="hnm-modal__btn">
                                <asp:LinkButton ID="lnkAddRoom" runat="server" CssClass="hnm-button" OnClick="lnkAddRoom_Click">ADD ROOM</asp:LinkButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Room Popup End -->
        </div>
    </div>

    <div id="divForWholeApartment" runat="server" visible="false">
        <div class="hnm-custom-tab hnm-r-pb-5" id="divWHScopes" runat="server">
            <div class="content-wrapper">
                <div class="hnm-head-with-total">
                    <h2 class="hnm-sub-head">Configure
                        <asp:Label ID="Label1" runat="server"></asp:Label></h2>
                    <div class="hnm-total-box">
                        <div class="hnm-total-box__txt">COST FOR THE ROOM</div>
                        <div class="hnm-total-box__amount">$<asp:Label ID="lblWHRoomTotalCost" runat="server"></asp:Label></div>
                    </div>
                </div>
                <div class="grey-box">
                    <h2 class="grey-box__title">Please select the following items you want to customise.</h2>
                    <div class="hnm-custom-tab__outer hnm-custom-tab__slider">
                        <asp:Repeater runat="server" ID="rptWHScopes">
                            <ItemTemplate>
                                <div class="hnm-icon-round" id='<%# "divWHScope" + DataBinder.Eval(Container.DataItem, "ScopeID")  %>'>
                                    <asp:ImageButton ID="ibWHScope" runat="server" CssClass="hnm-icon-round__img" ImageUrl='<%# Convert.ToString(Convert.ToString(Eval("ScopeID")) == Convert.ToString(Session["WHScopeID"]) ? Eval("ImageUrl2") : Eval("ImageUrl"))  %>' CommandArgument='<%# Eval("ScopeID") %>'
                                        OnClick="ibWHScope_Click" />
                                    <p class="hnm-icon-round__text"><%# Eval("Scope") %></p>
                                </div>
                            </ItemTemplate>
                        </asp:Repeater>
                    </div>
                </div>
            </div>
        </div>
        <div class="hnm-custom-item hnm-r-pb-6" id="divWHOptionItems" runat="server" visible="false">
            <div class="content-wrapper">
                <div class="hnm-box-head">
                    <h3 class="hnm-box-head__title">
                        <asp:Label ID="lblWHScope" runat="server"></asp:Label></h3>
                    <div class="hnm-box-head__cnt">
                        <p class="hnm-box-head__cnt-head">
                            Select the following package of
                                <asp:Label ID="lblWHScopeName" runat="server"></asp:Label>.
                        </p>
                        <div class="hnm-custom-item__material" id="divWHOptions" runat="server">
                            <%--<p class="hnm-custom-item__head">Material design and colour</p>--%>
                            <div class="hnm-custom-item__tab hnm-custom-item__tab-slider">
                                <asp:Repeater runat="server" ID="rptWHOptions">
                                    <ItemTemplate>
                                        <div id='<%# "divWHOption" + DataBinder.Eval(Container.DataItem, "WHOptionID")  %>' class="hnm-border-box">
                                            <asp:LinkButton ID="lnkWHOptions" runat="server" CommandArgument='<%# Eval("WHOptionID") %>' OnClick="lnkWHOptions_Click"><%# Eval("WHOptionName") %></asp:LinkButton>
                                        </div>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </div>
                        </div>
                        <div class="hnm-box-head__cnt" style="padding-bottom: 0px !important;" id="divDetailHead" runat="server" visible="false">
                            <p class="hnm-box-head__cnt-head">
                                Your apartment package is as follows, do you want to proceed ?
                            </p>
                        </div>
                        <div class="hnm-custom-item hnm-r-pb-6" id="divWHDetails" runat="server" visible="false">
                            <div class="content-wrapper">
                                <div class="hnm-box-head">
                                    <h3 class="hnm-box-head__title">
                                        <asp:Label ID="lblWHOption" runat="server"></asp:Label></h3>
                                    <div class="hnm-box-head__cnt">
                                        <asp:Literal ID="litWHOptionContent" runat="server"></asp:Literal>
                                        <div class="hnm-custom-item__select">
                                            <div class="hnm-custom-item__flex-btw">
                                                <div class="hnm-total-box">
                                                    <div class="hnm-total-box__txt">Package Price</div>
                                                    <div class="hnm-total-box__amount">
                                                        $
                                                    <asp:Label ID="lblWHPackagePrice" runat="server"></asp:Label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div class="hnm-custom-item__flex-btw" style="padding-right: 30px !important;" id="divWHSave" runat="server" visible="false">
                                <asp:Button ID="btnWHSave" runat="server" CssClass="hnm-button" Text="Save" OnClick="btnWHSave_Click" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="divNotWholeApartment" runat="server" visible="false">
        <div class="hnm-config-room hnm-r-pb-5" id="divRoomThemes" runat="server" visible="false">
            <div class="content-wrapper">
                <div class="hnm-head-with-total">
                    <h2 class="hnm-sub-head">Configure
                        <asp:Label ID="lblRoomName" runat="server"></asp:Label></h2>
                    <div class="hnm-total-box">
                        <div class="hnm-total-box__txt">COST FOR THE ROOM</div>
                        <div class="hnm-total-box__amount">$<asp:Label ID="lblRoomTotalCost" runat="server"></asp:Label></div>
                    </div>
                </div>
                <div class="hnm-box-head">
                    <h3 class="hnm-box-head__title">Choose a Design to Configure</h3>
                    <div class="hnm-box-head__cnt">
                        <div class="hnm-config-room__title">Select a design from the options below</div>
                        <div class="hnm-config-room__tile-outer hnm-config-room__slider">
                            <asp:Repeater runat="server" ID="rptRoomThemes">
                                <ItemTemplate>
                                    <div class="hnm-design-tile" id='<%# "divTheme" + DataBinder.Eval(Container.DataItem, "ThemeID")  %>'>
                                        <%-- <asp:ImageButton ID="imgThemes" runat="server" CssClass="hnm-design-tile__img-outer" ImageUrl='<%# Eval("ThemeImage") %>' />--%>
                                        <asp:LinkButton ID="lnkThemeImage" runat="server" OnClick="lnkThemeImage_Click" CommandArgument='<%# Eval("ThemeID") %>'>
                                            <div class="hnm-design-tile__img-outer" <%# Eval("ThemeImage") %>>
                                            </div>
                                        </asp:LinkButton>

                                        <%--<div class="hnm-design-tile__img-outer" data-toggle="modal" data-target='<%# "#imgSlider" + DataBinder.Eval(Container.DataItem, "ThemeID") %>'
                                            <%# Eval("ThemeImage") %>>
                                        </div>--%>
                                        <asp:LinkButton ID="lnkTheme" runat="server" CssClass="hnm-check-box" OnClick="lnkTheme_Click" CommandName='<%# Eval("ThemeID") %>' CommandArgument='<%# Eval("ThemeID") %>'>
                                        <span><%# Eval("ThemeName") %></span>
                                         <span class="hnm-check-box__check"></span>
                                        </asp:LinkButton>
                                    </div>
                                </ItemTemplate>
                            </asp:Repeater>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="hnm-custom-tab hnm-r-pb-5" id="divScopeItems" runat="server" visible="false">
            <div class="content-wrapper">
                <div class="grey-box">
                    <h2 class="grey-box__title">Please select the following items you want to customise.</h2>
                    <div class="hnm-custom-tab__outer hnm-custom-tab__slider">
                        <asp:Repeater runat="server" ID="rptRoomScopes">
                            <ItemTemplate>
                                <div class="hnm-icon-round" id='<%# "divScope" + DataBinder.Eval(Container.DataItem, "ScopeID")  %>'>
                                    <asp:ImageButton ID="ibScope" runat="server" CssClass="hnm-icon-round__img" ImageUrl='<%# Convert.ToString(Convert.ToString(Eval("ScopeID")) == Convert.ToString(Session["ScopeID"]) ? Eval("ImageUrl2") : Eval("ImageUrl"))  %>' CommandArgument='<%# Eval("ScopeID") %>'
                                        OnClick="ibScope_Click" />
                                    <p class="hnm-icon-round__text"><%# Eval("Scope") %></p>
                                </div>
                            </ItemTemplate>
                        </asp:Repeater>
                    </div>
                </div>
            </div>
        </div>

        <div class="hnm-custom-item hnm-r-pb-6" id="divOptionItems" runat="server" visible="false">
            <div class="content-wrapper">
                <div class="hnm-box-head">
                    <h3 class="hnm-box-head__title">
                        <asp:Label ID="lblSCScopeText" runat="server"></asp:Label></h3>
                    <div class="hnm-box-head__cnt">
                        <p class="hnm-box-head__cnt-head">
                            Please select the following materials for your
                                <asp:Label ID="lblSCScopeText2" runat="server"></asp:Label>.
                        </p>
                        <!-- Material sehnm-check-boxlect start -->
                        <%--<div class="hnm-custom-item__material">
                        <p class="hnm-custom-item__head">Material design and colour</p>
                        <div class="hnm-custom-item__tab hnm-custom-item__tab-slider">
                            <asp:Repeater runat="server" ID="rptOptions">
                                <ItemTemplate>
                                    <div class="hnm-border-box" id='<%# "divOption" + DataBinder.Eval(Container.DataItem, "OptionID")  %>'>
                                        <asp:LinkButton ID="lnkOption" runat="server" OnClick="lnkOption_Click" CommandArgument='<%# Eval("OptionID") %>'><%# Eval("Option") %></asp:LinkButton>
                                    </div>
                                </ItemTemplate>
                            </asp:Repeater>
                        </div>
                    </div>--%>
                        <!-- Material select end -->

                        <div class="hnm-custom-item__material" id="divOption" runat="server">
                            <p class="hnm-custom-item__head">Material design and colour</p>
                            <div class="hnm-custom-item__tab hnm-custom-item__tab-slider">
                                <asp:Repeater runat="server" ID="rptOptions">
                                    <ItemTemplate>
                                        <div id='<%# "divOption" + DataBinder.Eval(Container.DataItem, "OptionID")  %>' class="hnm-border-box">
                                            <asp:LinkButton ID="lnkOptions" runat="server" CommandArgument='<%# Eval("OptionID") %>' OnClick="lnkOptions_Click"><%# Eval("Option") %></asp:LinkButton>
                                        </div>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </div>
                        </div>
                        <div id="divSealerCostCondition" runat="server" class="hnm-border-box seperate" visible="false">
                            Sealer cost for resale condition apartment
                        <img alt="" src="assets/images/checked-icon.png" style="width: 20px; height: auto;" />
                        </div>


                        <%--<div class="hnm-custom-item__texture" id="divOption" runat="server">
                        <p class="hnm-box-head__cnt-head">Material design and colour.</p>
                        <div class="hnm-custom-item__tab hnm-custom-item__tab-slider">
                            <asp:Repeater runat="server" ID="rptOptions">
                                <ItemTemplate>
                                    <div class="hnm-texture-tile" id='<%# "divOption" + DataBinder.Eval(Container.DataItem, "OptionID")  %>'>
                                        <div class="hnm-texture-tile__img-sec">
                                            <asp:ImageButton ID="ibOption" runat="server" CssClass="hnm-texture-tile__img" ImageUrl='<%# Eval("ImageUrl") %>' CommandArgument='<%# Eval("OptionID") %>'
                                                OnClick="ibOption_Click" />
                                        </div>
                                        <p class="hnm-texture-tile__text"><%# Eval("Option") %></p>
                                    </div>
                                </ItemTemplate>
                            </asp:Repeater>
                        </div>
                    </div>--%>

                        <!-- Texture select start -->
                        <div class="hnm-custom-item__texture" id="divSubOptionItems" runat="server" visible="false">
                            <%--<p class="hnm-box-head__cnt-head">Please select the texture.</p>--%>
                            <p class="hnm-box-head__cnt-head"></p>
                            <div class="hnm-custom-item__slider hnm-custom-item__texture-slider">
                                <asp:Repeater runat="server" ID="rptSubOptions">
                                    <ItemTemplate>
                                        <div class="hnm-texture-tile" id='<%# "divSubOption" + DataBinder.Eval(Container.DataItem, "SubOptionID")  %>'>
                                            <div class="hnm-texture-tile__img-sec">
                                                <asp:ImageButton ID="ibSubOption" runat="server" CssClass="hnm-texture-tile__img" ImageUrl='<%# Eval("ImageUrl") %>' CommandArgument='<%# Eval("SubOptionID") %>'
                                                    OnClick="ibSubOption_Click" />
                                            </div>
                                            <p class="hnm-texture-tile__text"><%# Eval("SubOption") %></p>
                                        </div>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </div>
                        </div>
                        <!-- Texture select end -->

                        <!-- Size select start -->
                        <div class="hnm-custom-item__size" id="divSubSubOptionItems" runat="server" visible="false">
                            <p class="hnm-box-head__cnt-head hnm-box-head__cnt-head--bold">
                                <asp:Label ID="lblSubOptionName" runat="server"></asp:Label>
                            </p>
                            <p class="hnm-box-head__cnt-head">Please select the item.</p>
                            <div class="hnm-custom-item__slider hnm-custom-item__size-slider">
                                <asp:Repeater runat="server" ID="rptSubSubOption">
                                    <ItemTemplate>
                                        <div class="hnm-texture-tile" id='<%# "divSubsubOption" + DataBinder.Eval(Container.DataItem, "SubsubOptionID")  %>'>
                                            <div class="hnm-texture-tile__img-sec">
                                                <asp:ImageButton ID="ibSubsubOption" runat="server" CssClass="hnm-texture-tile__img" ImageUrl='<%# Eval("ImageUrl") %>' CommandArgument='<%# Eval("SubsubOptionID") %>'
                                                    OnClick="ibSubsubOption_Click" />
                                            </div>
                                            <p class="hnm-texture-tile__text"><%# Eval("SubsubOption") %></p>
                                        </div>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </div>
                        </div>

                        <div class="hnm-custom-item__size" id="divSubSubOptionL2Items" runat="server" visible="false">
                            <p class="hnm-box-head__cnt-head hnm-box-head__cnt-head--bold">
                                <asp:Label ID="lblSSubOptionText" runat="server"></asp:Label>
                            </p>
                            <p class="hnm-box-head__cnt-head">Please select the item.</p>
                            <div class="hnm-custom-item__slider hnm-custom-item__size-slider">
                                <asp:Repeater runat="server" ID="rptSubSubOptionL2">
                                    <ItemTemplate>
                                        <div class="hnm-texture-tile" id='<%# "divSubsubOptionL2" + DataBinder.Eval(Container.DataItem, "SubsubOptionL2ID")  %>'>
                                            <div class="hnm-texture-tile__img-sec">
                                                <asp:ImageButton ID="ibSubsubOptionl2" runat="server" CssClass="hnm-texture-tile__img" ImageUrl='<%# Eval("ImageUrl") %>' CommandArgument='<%# Eval("SubsubOptionL2ID") %>'
                                                    OnClick="ibSubsubOptionl2_Click" />
                                            </div>
                                            <p class="hnm-texture-tile__text"><%# Eval("SubsubOptionL2") %></p>
                                        </div>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </div>
                        </div>

                        <div class="hnm-custom-item__size" id="divSubSubOptionL3Items" runat="server" visible="false">
                            <p class="hnm-box-head__cnt-head hnm-box-head__cnt-head--bold">
                                <asp:Label ID="lblSSubOptionl2Text" runat="server"></asp:Label>
                            </p>
                            <p class="hnm-box-head__cnt-head">Please select the item.</p>
                            <div class="hnm-custom-item__slider hnm-custom-item__size-slider">
                                <asp:Repeater runat="server" ID="rptSubSubOptionL3">
                                    <ItemTemplate>
                                        <div class="hnm-texture-tile" id='<%# "divSubSubOptionL3" + DataBinder.Eval(Container.DataItem, "SubsubOptionL3ID")  %>'>
                                            <div class="hnm-texture-tile__img-sec">
                                                <asp:ImageButton ID="ibSubsubOptionL3" runat="server" CssClass="hnm-texture-tile__img" ImageUrl='<%# Eval("ImageUrl") %>' CommandArgument='<%# Eval("SubsubOptionL3ID") %>'
                                                    OnClick="ibSubsubOptionL3_Click" />
                                            </div>
                                            <p class="hnm-texture-tile__text"><%# Eval("SubsubOptionL3") %></p>
                                        </div>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </div>
                        </div>
                        <!-- Size select end -->

                        <!-- Floor area section -->
                        <asp:UpdatePanel runat="server" UpdateMode="Always">
                            <ContentTemplate>
                                <div class="hnm-custom-item__area grey-box grey-box--no-border">
                                    <div class="hnm-custom-item__area-wrap" id="divL3Details" runat="server" visible="false">
                                        <p class="hnm-box-head__cnt-head">
                                            <asp:Label ID="LblAreaQty" runat="server"></asp:Label>
                                        </p>
                                        <div class="hnm-custom-item__area-outer">
                                            <div class="hnm-custom-item__area-inner" id="DivLength" runat="server" visible="false">
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">Length(mm):</p>
                                                    <asp:TextBox ID="txtLength" runat="server" CssClass="hnm-custom-item__area-input" OnTextChanged="txtLength_TextChanged" AutoPostBack="true"></asp:TextBox>
                                                </div>
                                                <div class="hnm-custom-item__unit" id="divLenghtft" runat="server">
                                                    <p class="hnm-custom-item__unit-text">Length(ft):<asp:Label ID="lblLengthft" runat="server"></asp:Label></p>
                                                </div>
                                            </div>
                                            <div class="hnm-custom-item__area-inner" id="DivWidth" runat="server">
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">Width(mm):</p>
                                                    <asp:TextBox ID="txtWidth" runat="server" CssClass="hnm-custom-item__area-input" OnTextChanged="txtWidth_TextChanged" AutoPostBack="true"></asp:TextBox>
                                                </div>
                                                <div class="hnm-custom-item__unit" id="divwidthtft" runat="server">
                                                    <p class="hnm-custom-item__unit-text">Width(ft):<asp:Label ID="lblWidthft" runat="server"></asp:Label></p>
                                                </div>
                                            </div>
                                            <div class="hnm-custom-item__area-inner" id="DivArea" runat="server">
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">Area(mm²):</p>
                                                    <asp:TextBox ID="txtArea" runat="server" CssClass="hnm-custom-item__area-input" ReadOnly="true" Enabled="false"></asp:TextBox>
                                                </div>
                                                <div class="hnm-custom-item__unit" id="divAreaft" runat="server">
                                                    <p class="hnm-custom-item__unit-text">Area(sqft):<asp:Label ID="lblAreaft" runat="server"></asp:Label></p>
                                                </div>
                                            </div>
                                            <div class="hnm-custom-item__area-inner" id="DivQuantity" runat="server">
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">Quantity(NOS):</p>
                                                    <asp:TextBox ID="txtQuantity" runat="server" CssClass="hnm-custom-item__area-input"></asp:TextBox>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="hnm-custom-item__area-wrap" id="divDataCollection" runat="server" visible="false">
                                        <p class="hnm-box-head__cnt-head">Please add your data</p>
                                        <div class="hnm-custom-item__area-outer">
                                            <div class="hnm-custom-item__area-inner" id="divDCLength" runat="server" visible="false">
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">
                                                        <asp:Label ID="lblDCLengthText" runat="server"></asp:Label>(ft):
                                                    </p>
                                                    <asp:TextBox ID="txtDCLength" runat="server" CssClass="hnm-custom-item__area-input" OnTextChanged="txtDCLength_TextChanged" AutoPostBack="true"></asp:TextBox>
                                                </div>
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">
                                                        <asp:Label ID="lblDCLengthText2" runat="server"></asp:Label>(mm):
                                            <asp:Label ID="lblDCLengthmm" runat="server"></asp:Label>
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="hnm-custom-item__area-inner" id="divDCWidth" runat="server">
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">
                                                        <asp:Label ID="lblDCWidthText" runat="server"></asp:Label>(ft):
                                                    </p>
                                                    <asp:TextBox ID="txtDCWidth" runat="server" CssClass="hnm-custom-item__area-input" OnTextChanged="txtDCWidth_TextChanged" AutoPostBack="true"></asp:TextBox>
                                                </div>
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">
                                                        <asp:Label ID="lblDCWidthText2" runat="server"></asp:Label>(mm):<asp:Label ID="lblDCWidthmm" runat="server"></asp:Label>
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="hnm-custom-item__area-inner" id="DivDCHeight" runat="server">
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">
                                                        <asp:Label ID="lblDCHeightText" runat="server"></asp:Label>(ft):
                                                    </p>
                                                    <asp:TextBox ID="txtDCHeight" runat="server" CssClass="hnm-custom-item__area-input" OnTextChanged="txtDCHeight_TextChanged"></asp:TextBox>
                                                </div>
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">
                                                        <asp:Label ID="lblDCHeightText2" runat="server"></asp:Label>(mm):<asp:Label ID="lblDCHeightmm" runat="server"></asp:Label>
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="hnm-custom-item__area-inner" id="DivDCTickness" runat="server">
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">
                                                        <asp:Label ID="lblDCTicknessText" runat="server"></asp:Label>(ft):
                                                    </p>
                                                    <asp:TextBox ID="txtDCThickness" runat="server" CssClass="hnm-custom-item__area-input" OnTextChanged="txtDCThickness_TextChanged"></asp:TextBox>
                                                </div>
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">
                                                        <asp:Label ID="lblDCTicknessText2" runat="server"></asp:Label>(mm):<asp:Label ID="lblDCThicknessmm" runat="server"></asp:Label>
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="hnm-custom-item__area-inner" id="divDCQuantity" runat="server">
                                                <div class="hnm-custom-item__unit">
                                                    <p class="hnm-custom-item__unit-text">
                                                        <asp:Label ID="lblDCQuantityText" runat="server"></asp:Label>(NOS):
                                                    </p>
                                                    <asp:TextBox ID="txtDCQuantity" runat="server" CssClass="hnm-custom-item__area-input"></asp:TextBox>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ContentTemplate>
                        </asp:UpdatePanel>




                        <!-- Floor area section end -->

                        <!-- Select option start -->

                        <div class="hnm-custom-item__select">
                            <p class="hnm-box-head__cnt-head" id="divOptionAddsOnHead" runat="server" visible="false">Please select your option:</p>
                            <div class="hnm-custom-item__flex-btw">
                                <div id="divOptionAddsOn" runat="server" visible="false">
                                    <asp:Repeater ID="rptAddOns" runat="server">
                                        <ItemTemplate>
                                            <div class="hnm-check-box">
                                                <asp:CheckBox ID="ChkAddOn" runat="server" Text='<%# Eval("Option") %>' />
                                                <asp:HiddenField ID="OptionVal" runat="server" Value='<%# Eval("OptionID") %>' />
                                            </div>
                                        </ItemTemplate>
                                    </asp:Repeater>
                                </div>
                                <asp:Button ID="btnSave" runat="server" CssClass="hnm-button" Text="Save" OnClick="btnSave_Click" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="hnm-custom-item hnm-r-pb-6" id="divScopeDeatilList" runat="server" visible="false">
            <div class="content-wrapper">
                <div class="hnm-box-head">
                    <%--<h3 class="hnm-box-head__title">
                    <asp:Label ID="lblScopeDetailHead" runat="server"></asp:Label>
                </h3>--%>
                    <div class="hnm-box-head__cnt">
                        <dx:ASPxGridView ID="GridRoomOptions" runat="server" ClientInstanceName="GridRoomOptions" Width="100%" CssClass="table-fontsize small" AutoGenerateColumns="False" KeyFieldName="ScopesInProjectRoomID"
                            EnableRowsCache="false" EnableCallBacks="false" SettingsText-EmptyDataRow="No items have been saved yet">
                            <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                            <Columns>
                                <dx:GridViewDataTextColumn FieldName="ScopesInProjectRoomID" VisibleIndex="1" Visible="false" EditFormSettings-Visible="False" PropertiesTextEdit-EncodeHtml="false">
                                </dx:GridViewDataTextColumn>
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
                                        <asp:Button ID="lnkRemoveItem" runat="server" CssClass="hnm-button" OnClick="lnkRemoveItem_Click"
                                            CommandArgument='<% #Bind("ScopesInProjectRoomID")%>' CausesValidation="false" Text="Remove"></asp:Button>
                                    </DataItemTemplate>
                                </dx:GridViewDataColumn>
                            </Columns>
                            <SettingsPager PageSize="10" NumericButtonCount="6" />
                            <Settings ShowFilterRow="false" />
                        </dx:ASPxGridView>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="AddItemModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel">
        <div class="modal-dialog" style="pointer-events: auto !important;">
            <div class="modal-content" style="pointer-events: auto !important;">
                <div class="grey-box grey-box--centered">
                    <h1 class="hnm-main-head">Please add items to proceed</h1>
                    <asp:Button ID="BtnOk" runat="server" class="hnm-button" Style="margin-right: 40%; margin-left: 40%; width: 20%" Text="OK" OnClick="BtnOk_Click" />
                </div>
            </div>
        </div>
    </div>
    <asp:UpdatePanel ID="upSlider" UpdateMode="Always" runat="server">
        <ContentTemplate>
            <div class="modal fade hnm-img-slider" id="imgSlider" tabindex="-1" aria-labelledby="imgSliderLabel" aria-modal="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-body">
                            <div id="btnmodalclose" class="close">
                                <asp:ImageButton ID="imgModalColse" runat="server" class="hnm-img-slider__close-icon" ImageUrl="../assets/images/close-icon-grey-round.svg"
                                    OnClick="imgModalColse_Click" alt="X" />
                            </div>
                            <div id="divimgsliderfor" class="hnm-img-slider__for">
                                <asp:Repeater ID="rptSliderFor" runat="server">
                                    <ItemTemplate>
                                        <div class="hnm-img-slider__for-item zoom-box">
                                            <img src='<%# Eval("Thumbnail") %>' alt="" />
                                        </div>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </div>
                            <div id="divimgslidernav" class="hnm-img-slider__nav">
                                <asp:Repeater ID="rptSliderNav" runat="server">
                                    <ItemTemplate>
                                        <div class='<%# Eval("ImgID").ToString() == "1" ? "hnm-img-slider__nav-item zoomThumbActive": "hnm-img-slider__nav-item" %>'>
                                            <img src='<%# Eval("Thumbnail") %>' alt="" />
                                        </div>
                                    </ItemTemplate>
                                </asp:Repeater>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
    <asp:Literal ID="litThemeImageSilderPopUp" runat="server"></asp:Literal>
    <asp:Literal ID="litdivmodalbottom" runat="server"></asp:Literal>
    <%--<div class="modal-backdrop fade" id="divModalBottom"></div>--%>
    <%--</ContentTemplate>
    </asp:UpdatePanel>--%>
</asp:Content>

